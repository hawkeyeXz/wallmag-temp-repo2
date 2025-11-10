// app/api/admin/users/assign-role/route.ts
import Profiles from "@/app/models/Profiles";
import RegisteredUsers from "@/app/models/RegisteredUser";
import { invalidateProfileCache, requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

// POST - Assign role to user (admin only)
export async function POST(req: Request) {
    try {
        const { error, user, profile } = await requirePermission("assign_editors");
        if (error) return error;

        await dbConnect();

        const body = await req.json();
        const { id_number, role } = body;

        // Validation
        if (!id_number || !role) {
            return NextResponse.json({ message: "id_number and role are required" }, { status: 400 });
        }

        // Validate role
        const validRoles = ["student", "Professor", "editor", "publisher", "admin"];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { message: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
                { status: 400 }
            );
        }

        // Prevent self-demotion (admin cannot remove their own admin role)
        if (profile.id_number === id_number && profile.role === "admin" && role !== "admin") {
            return NextResponse.json({ message: "Cannot remove your own admin privileges" }, { status: 403 });
        }

        // Find target user
        const targetProfile = await Profiles.findOne({ id_number });
        if (!targetProfile) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const oldRole = targetProfile.role;

        // Update role in Profile
        targetProfile.role = role;
        await targetProfile.save();

        // Also update role in RegisteredUsers (for consistency)
        await RegisteredUsers.updateOne({ id_number }, { $set: { role } });

        // Invalidate cache so new permissions take effect immediately
        await invalidateProfileCache(id_number);

        console.log(`[INFO] Role changed: ${id_number} from ${oldRole} to ${role} by admin ${profile.name}`);

        // TODO: Send notification email to user about role change
        // await sendRoleChangeEmail(targetProfile.email, oldRole, role);

        return NextResponse.json(
            {
                message: `User role updated successfully`,
                user: {
                    id_number: targetProfile.id_number,
                    name: targetProfile.name,
                    old_role: oldRole,
                    new_role: role,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Assign role error:", error);
        return NextResponse.json({ message: "Failed to assign role" }, { status: 500 });
    }
}

// GET - Search users (for admin to find and assign roles)
export async function GET(req: Request) {
    try {
        const { error, user, profile } = await requirePermission("manage_users");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const role = searchParams.get("role");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Build search query
        const searchQuery: any = {};

        if (query) {
            searchQuery.$or = [
                { name: { $regex: query, $options: "i" } },
                { id_number: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ];
        }

        if (role) {
            searchQuery.role = role;
        }

        // Find users
        const users = await Profiles.find(searchQuery)
            .select("id_number name email role created_at last_login")
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Profiles.countDocuments(searchQuery);

        // Role statistics
        const roleStats = await Profiles.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 },
                },
            },
        ]);

        const roleCounts = roleStats.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        return NextResponse.json(
            {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
                role_stats: {
                    student: roleCounts.student || 0,
                    Professor: roleCounts.Professor || 0,
                    editor: roleCounts.editor || 0,
                    publisher: roleCounts.publisher || 0,
                    admin: roleCounts.admin || 0,
                    total,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Search users error:", error);
        return NextResponse.json({ message: "Failed to search users" }, { status: 500 });
    }
}
