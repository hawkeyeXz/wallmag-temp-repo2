import MagazineEdition from "@/app/models/MagazineEdition";
import { requirePermission } from "@/lib/auth/permissions";
import { uploadFile, validateFile } from "@/lib/blob";
import { dbConnect } from "@/lib/mongoose";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // 1. Auth & Permission Check
        const { error, profile } = await requirePermission("publish_post");
        if (error) return error;

        await dbConnect();

        // 2. Parse Form Data
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const academicYear = formData.get("academic_year") as string; // Optional

        if (!file) return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        if (!title) return NextResponse.json({ message: "Title is required" }, { status: 400 });

        // 3. Validate File
        const val = validateFile(file, ["application/pdf"], 50 * 1024 * 1024); // 50MB limit
        if (!val.valid) return NextResponse.json({ message: val.error }, { status: 400 });

        // 4. Upload to Vercel Blob
        // Organize in folders by year or simply 'editions'
        const filename = `editions/${new Date().getFullYear()}/${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const url = await uploadFile(file, filename);

        // 5. Database Operations
        // a. Set previous current editions to false
        await MagazineEdition.updateMany({ is_current: true }, { is_current: false });

        // b. Create new edition record
        const newEdition = await MagazineEdition.create({
            title,
            pdf_url: url,
            published_by: profile._id,
            published_at: new Date(),
            is_current: true, // Make this the live version
            description: description || undefined,
            academic_year: academicYear || undefined,
        });

        return NextResponse.json(
            {
                message: "Magazine uploaded and published successfully",
                edition: newEdition,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[ERROR] Magazine upload failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
