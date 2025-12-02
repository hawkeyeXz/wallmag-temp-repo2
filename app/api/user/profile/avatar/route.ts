import Profile from "@/app/models/Profiles";
import { deleteFile, FILE_TYPES, uploadFile, validateFile } from "@/lib/blob";
import { dbConnect } from "@/lib/mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const token = cookieStore.get("session_token")?.value;

        if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!);
        } catch (err) {
            return NextResponse.json({ message: "Invalid session" }, { status: 401 });
        }

        // 1. Parse File
        const formData = await req.formData();
        const file = formData.get("avatar") as File;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        // 2. Validate
        const validation = validateFile(file, FILE_TYPES.IMAGES, 5 * 1024 * 1024); // 5MB limit for avatars
        if (!validation.valid) {
            return NextResponse.json({ message: validation.error }, { status: 400 });
        }

        const profile = await Profile.findOne({ id_number: decoded.id_number });
        if (!profile) return NextResponse.json({ message: "Profile not found" }, { status: 404 });

        // 3. Delete Old Avatar (Cleanup)
        if (profile.profile_picture_url) {
            await deleteFile(profile.profile_picture_url);
        }

        // 4. Upload New Avatar
        const url = await uploadFile(file, `avatars/${profile._id}`);

        // 5. Update DB
        profile.profile_picture_url = url;
        await profile.save();

        return NextResponse.json(
            {
                message: "Avatar updated successfully",
                profile_picture_url: url,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[ERROR] Avatar upload failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
