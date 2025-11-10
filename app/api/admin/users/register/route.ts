// app/api/admin/users/register/route.ts
import RegisteredUsers from "@/app/models/RegisteredUser";
import { requireAnyPermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface UserData {
    name: string;
    id_number: string;
    email: string;
    phone?: string;
    department?: string;
    role: "student" | "Professor";
}

/**
 * Validate user data
 */
function validateUserData(data: any, index?: number): { valid: boolean; user?: UserData; error?: string } {
    const prefix = index !== undefined ? `Row ${index + 1}: ` : "";

    // Required fields
    if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
        return { valid: false, error: `${prefix}Name is required` };
    }

    if (!data.id_number || typeof data.id_number !== "string" || data.id_number.trim().length === 0) {
        return { valid: false, error: `${prefix}ID number is required` };
    }

    if (!data.email || typeof data.email !== "string" || data.email.trim().length === 0) {
        return { valid: false, error: `${prefix}Email is required` };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
        return { valid: false, error: `${prefix}Invalid email format` };
    }

    // Validate ID number format (alphanumeric, 4-20 chars)
    const idNumber = data.id_number.trim();
    if (!/^[a-zA-Z0-9]{4,20}$/.test(idNumber)) {
        return { valid: false, error: `${prefix}ID number must be 4-20 alphanumeric characters` };
    }

    // Validate role (default to student)
    const role = data.role?.toLowerCase() === "professor" ? "Professor" : "student";

    // Optional phone validation
    if (data.phone && typeof data.phone === "string") {
        const phone = data.phone.trim();
        if (phone && !/^[0-9+\-\s()]{10,15}$/.test(phone)) {
            return { valid: false, error: `${prefix}Invalid phone number format` };
        }
    }

    return {
        valid: true,
        user: {
            name: data.name.trim(),
            id_number: idNumber,
            email: data.email.trim().toLowerCase(),
            phone: data.phone?.trim() || undefined,
            department: data.department?.trim() || undefined,
            role,
        },
    };
}

/**
 * Parse CSV file
 */
function parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const text = buffer.toString("utf-8");

        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => {
                // Normalize headers (case-insensitive, trim spaces)
                return header.trim().toLowerCase().replace(/\s+/g, "_");
            },
            complete: results => {
                resolve(results.data);
            },
            error: (error: any) => {
                reject(new Error(`CSV parsing error: ${error.message}`));
            },
        });
    });
}

/**
 * Parse Excel file
 */
function parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error("Excel file has no sheets");
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        defval: "",
    });

    // Normalize keys (lowercase, replace spaces with underscores)
    return data.map((row: any) => {
        const normalized: any = {};
        Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
            normalized[normalizedKey] = row[key];
        });
        return normalized;
    });
}

// GET - List registered users (with filters)
export async function GET(req: Request) {
    try {
        const { error, user, profile } = await requireAnyPermission(["assign_editors", "manage_users"]);
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const role = searchParams.get("role");
        const is_signed_up = searchParams.get("is_signed_up");
        const department = searchParams.get("department");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        // Build query
        const searchQuery: any = {};

        if (query) {
            searchQuery.$or = [
                { name: { $regex: query, $options: "i" } },
                { id_number: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ];
        }

        if (role && ["student", "Professor"].includes(role)) {
            searchQuery.role = role;
        }

        if (is_signed_up !== null && is_signed_up !== undefined) {
            searchQuery.is_signed_up = is_signed_up === "true";
        }

        if (department) {
            searchQuery.department = { $regex: department, $options: "i" };
        }

        // Fetch users
        const users = await RegisteredUsers.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-__v");

        const total = await RegisteredUsers.countDocuments(searchQuery);

        // Statistics
        const stats = await RegisteredUsers.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    students: {
                        $sum: { $cond: [{ $eq: ["$role", "student"] }, 1, 0] },
                    },
                    professors: {
                        $sum: { $cond: [{ $eq: ["$role", "Professor"] }, 1, 0] },
                    },
                    signed_up: {
                        $sum: { $cond: ["$is_signed_up", 1, 0] },
                    },
                    not_signed_up: {
                        $sum: { $cond: ["$is_signed_up", 0, 1] },
                    },
                },
            },
        ]);

        return NextResponse.json(
            {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
                stats: stats[0] || {
                    total: 0,
                    students: 0,
                    professors: 0,
                    signed_up: 0,
                    not_signed_up: 0,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Get registered users error:", error);
        return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
    }
}
export async function POST(req: Request) {
    try {
        const { error, user, profile } = await requireAnyPermission(["assign_editors", "manage_users"]);
        if (error) return error;

        await dbConnect();

        const contentType = req.headers.get("content-type") || "";

        let usersToRegister: UserData[] = [];
        let uploadType: "single" | "csv" | "excel" = "single";

        // Handle JSON (single user or array)
        if (contentType.includes("application/json")) {
            const body = await req.json();

            if (Array.isArray(body)) {
                // Multiple users
                for (let i = 0; i < body.length; i++) {
                    const validation = validateUserData(body[i], i);
                    if (!validation.valid) {
                        return NextResponse.json({ message: validation.error }, { status: 400 });
                    }
                    usersToRegister.push(validation.user!);
                }
            } else {
                // Single user
                const validation = validateUserData(body);
                if (!validation.valid) {
                    return NextResponse.json({ message: validation.error }, { status: 400 });
                }
                usersToRegister.push(validation.user!);
            }
        }
        // Handle file upload (CSV or Excel)
        else if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                return NextResponse.json({ message: "File is required" }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = file.name.toLowerCase();

            let parsedData: any[] = [];

            // Parse CSV
            if (filename.endsWith(".csv")) {
                uploadType = "csv";
                parsedData = await parseCSV(buffer);
            }
            // Parse Excel
            else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                uploadType = "excel";
                parsedData = parseExcel(buffer);
            } else {
                return NextResponse.json(
                    { message: "Invalid file format. Only CSV and Excel files are supported" },
                    { status: 400 }
                );
            }

            if (parsedData.length === 0) {
                return NextResponse.json({ message: "File is empty or invalid" }, { status: 400 });
            }

            if (parsedData.length > 500) {
                return NextResponse.json({ message: "Maximum 500 users per upload" }, { status: 400 });
            }

            // Validate each row
            for (let i = 0; i < parsedData.length; i++) {
                const validation = validateUserData(parsedData[i], i);
                if (!validation.valid) {
                    return NextResponse.json({ message: validation.error }, { status: 400 });
                }
                usersToRegister.push(validation.user!);
            }
        } else {
            return NextResponse.json({ message: "Invalid content type" }, { status: 400 });
        }

        if (usersToRegister.length === 0) {
            return NextResponse.json({ message: "No valid users to register" }, { status: 400 });
        }

        // Check for duplicates in database
        const existingIds = await RegisteredUsers.find({
            id_number: { $in: usersToRegister.map(u => u.id_number) },
        }).select("id_number");

        const existingIdSet = new Set(existingIds.map(u => u.id_number));

        const duplicates = usersToRegister.filter(u => existingIdSet.has(u.id_number));

        if (duplicates.length > 0) {
            return NextResponse.json(
                {
                    message: "Duplicate ID numbers found",
                    duplicates: duplicates.map(u => u.id_number),
                },
                { status: 400 }
            );
        }

        // Check for duplicate emails
        const existingEmails = await RegisteredUsers.find({
            email: { $in: usersToRegister.map(u => u.email) },
        }).select("email");

        const existingEmailSet = new Set(existingEmails.map(u => u.email));

        const emailDuplicates = usersToRegister.filter(u => existingEmailSet.has(u.email));

        if (emailDuplicates.length > 0) {
            return NextResponse.json(
                {
                    message: "Duplicate emails found",
                    duplicates: emailDuplicates.map(u => u.email),
                },
                { status: 400 }
            );
        }

        // Bulk insert
        const registered = await RegisteredUsers.insertMany(usersToRegister, { ordered: false });

        console.log(`[INFO] ${registered.length} users registered by ${profile.name} (${uploadType} upload)`);

        return NextResponse.json(
            {
                message: `Successfully registered ${registered.length} user${registered.length > 1 ? "s" : ""}`,
                registered: registered.length,
                type: uploadType,
                users: registered.map(u => ({
                    id_number: u.id_number,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                })),
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[ERROR] Register users error:", error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return NextResponse.json({ message: "Duplicate ID number or email found in database" }, { status: 400 });
        }

        return NextResponse.json({ message: "Failed to register users" }, { status: 500 });
    }
}
