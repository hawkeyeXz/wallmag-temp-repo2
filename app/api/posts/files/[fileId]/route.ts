// app/api/posts/files/[fileId]/route.ts
import Post from "@/app/models/Post";
import { getFileInfo, streamFileToResponse } from "@/lib/gridfs";
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

// GET - View/stream file (designed files are public for published posts)
export async function GET(req: Request, { params }: { params: { fileId: string } }) {
    try {
        await dbConnect();

        const { fileId } = params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return NextResponse.json({ message: "Invalid file ID" }, { status: 400 });
        }

        const fileObjectId = new mongoose.Types.ObjectId(fileId);

        // Find which post this file belongs to
        const post = await Post.findOne({
            $or: [{ "designed_files.file_id": fileObjectId }, { "original_images.file_id": fileObjectId }],
        });

        if (!post) {
            return NextResponse.json({ message: "File not found" }, { status: 404 });
        }

        // Access control: Only published posts' designed files are publicly accessible
        let isDesignedFile = false;
        let isOriginalImage = false;
        let file: any = null;

        // Check if it's a designed file
        if (post.designed_files && post.designed_files.length > 0) {
            file = post.designed_files.find((f: any) => f.file_id.toString() === fileObjectId.toString());
            if (file) {
                isDesignedFile = true;
            }
        }

        // Check if it's an original image (for artwork category)
        if (!file && post.original_images && post.original_images.length > 0) {
            file = post.original_images.find((f: any) => f.file_id.toString() === fileObjectId.toString());
            if (file) {
                isOriginalImage = true;
            }
        }

        if (!file) {
            return NextResponse.json({ message: "File not found" }, { status: 404 });
        }

        // Public access only for published posts' designed files
        if (post.status !== "PUBLISHED" && (isDesignedFile || isOriginalImage)) {
            // TODO: Add authentication check for editors/admins to preview
            return NextResponse.json({ message: "File not accessible" }, { status: 403 });
        }

        // Verify file exists in GridFS
        let fileInfo;
        try {
            fileInfo = await getFileInfo(fileObjectId);
        } catch (err) {
            return NextResponse.json({ message: "File not found in storage" }, { status: 404 });
        }

        // Stream file
        const stream = streamFileToResponse(fileObjectId);

        // Determine content disposition (inline for images/PDFs, attachment for others)
        const isInline = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
        const disposition = isInline
            ? `inline; filename="${encodeURIComponent(file.filename)}"`
            : `attachment; filename="${encodeURIComponent(file.filename)}"`;

        return new Response(stream, {
            headers: {
                "Content-Type": file.mimetype,
                "Content-Disposition": disposition,
                "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
                "X-Post-ID": post._id.toString(),
            },
        });
    } catch (error) {
        console.error("[ERROR] View file error:", error);
        return NextResponse.json({ message: "Failed to load file" }, { status: 500 });
    }
}
