// app/api/admin/users/template/route.ts
import { requireAnyPermission } from "@/lib/auth/permissions";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// GET - Download CSV/Excel template
export async function GET(req: Request) {
    try {
        const { error } = await requireAnyPermission(["assign_editors", "manage_users"]);
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const format = searchParams.get("format") || "csv"; // csv or excel

        // Template data
        const template = [
            {
                name: "John Doe",
                id_number: "PHY2023001",
                email: "john.doe@example.com",
                phone: "+1234567890",
                department: "Physics",
                role: "student", // student or Professor
            },
            {
                name: "Dr. Jane Smith",
                id_number: "PROF001",
                email: "jane.smith@example.com",
                phone: "+0987654321",
                department: "Physics",
                role: "Professor",
            },
        ];

        if (format === "excel") {
            // Generate Excel file
            const worksheet = XLSX.utils.json_to_sheet(template);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

            // Add column widths
            worksheet["!cols"] = [
                { wch: 20 }, // name
                { wch: 15 }, // id_number
                { wch: 30 }, // email
                { wch: 15 }, // phone
                { wch: 20 }, // department
                { wch: 10 }, // role
            ];

            const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

            return new Response(buffer, {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": "attachment; filename=user_registration_template.xlsx",
                },
            });
        } else {
            // Generate CSV
            const worksheet = XLSX.utils.json_to_sheet(template);
            const csv = XLSX.utils.sheet_to_csv(worksheet);

            return new Response(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": "attachment; filename=user_registration_template.csv",
                },
            });
        }
    } catch (error) {
        console.error("[ERROR] Download template error:", error);
        return NextResponse.json({ message: "Failed to generate template" }, { status: 500 });
    }
}
