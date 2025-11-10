// app/api/admin/users/register/[id_number]/route.ts
import Profiles from "@/app/models/Profiles";
import RegisteredUsers from "@/app/models/RegisteredUser";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

// GET - Get single registered user
export async function GET(req: Request, { params }: { params: { id_number: string } }) {
    try {
        const { error } = await requirePermission("manage_users");
        if (error) return error;

        await dbConnect();

        const { id_number } = params;

        const user = await RegisteredUsers.findOne({ id_number });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Check if user has signed up
        let profile = null;
        if (user.is_signed_up) {
            profile = await Profiles.findOne({ id_number }).select("-password");
        }

        return NextResponse.json(
            {
                registered_user: user,
                profile,
                has_account: !!profile,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Get registered user error:", error);
        return NextResponse.json({ message: "Failed to fetch user" }, { status: 500 });
    }
}

// PATCH - Update registered user details
export async function PATCH(req: Request, { params }: { params: { id_number: string } }) {
    try {
        const { error, user: authUser, profile } = await requirePermission("manage_users");
        if (error) return error;

        await dbConnect();

        const { id_number } = params;
        const body = await req.json();

        const user = await RegisteredUsers.findOne({ id_number });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Cannot update if user has already signed up (would break profile link)
        if (user.is_signed_up) {
            return NextResponse.json(
                { message: "Cannot update user who has already signed up. Update their profile instead." },
                { status: 400 }
            );
        }

        // Update allowed fields
        const allowedFields = ["name", "email", "phone", "department", "role"];
        const updates: any = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === "email") {
                    // Validate email
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(body[field])) {
                        return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
                    }
                    updates[field] = body[field].toLowerCase().trim();
                } else if (field === "role") {
                    if (!["student", "Professor"].includes(body[field])) {
                        return NextResponse.json({ message: "Invalid role" }, { status: 400 });
                    }
                    updates[field] = body[field];
                } else {
                    updates[field] = body[field].trim();
                }
            }
        }

        // Update user
        Object.assign(user, updates);
        await user.save();

        console.log(`[INFO] Registered user updated: ${id_number} by ${profile.name}`);

        return NextResponse.json(
            {
                message: "User updated successfully",
                user,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("[ERROR] Update registered user error:", error);

        if (error.code === 11000) {
            return NextResponse.json({ message: "Email already exists" }, { status: 400 });
        }

        return NextResponse.json({ message: "Failed to update user" }, { status: 500 });
    }
}

// DELETE - Remove registered user
export async function DELETE(req: Request, { params }: { params: { id_number: string } }) {
    try {
        const { error, user: authUser, profile } = await requirePermission("manage_users");
        if (error) return error;

        await dbConnect();

        const { id_number } = params;

        const user = await RegisteredUsers.findOne({ id_number });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Check if user has signed up and created profile
        if (user.is_signed_up) {
            const existingProfile = await Profiles.findOne({ id_number });

            if (existingProfile) {
                return NextResponse.json(
                    {
                        message: "Cannot delete user who has signed up. Delete their profile first.",
                        has_profile: true,
                    },
                    { status: 400 }
                );
            }
        }

        // Delete user
        await RegisteredUsers.deleteOne({ id_number });

        console.log(`[INFO] Registered user deleted: ${id_number} by ${profile.name}`);

        return NextResponse.json(
            {
                message: "User deleted successfully",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Delete registered user error:", error);
        return NextResponse.json({ message: "Failed to delete user" }, { status: 500 });
    }
}
