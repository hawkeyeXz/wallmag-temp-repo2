// app/api/posts/[id]/download/route.ts
import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { getFileInfo, streamFileToResponse } from "@/lib/gridfs";
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { error, user, profile } = await requirePermission("download_original_files");
        if (error) return error;

        await dbConnect();

        const { id } = params;
        const { searchParams } = new URL(req.url);
        const fileType = searchParams.get("type");
        const imageIndex = searchParams.get("imageIndex");

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid post ID" }, { status: 400 });
        }

        const post = await Post.findById(id);

        if (!post) {
            return NextResponse.json({ message: "Post not found" }, { status: 404 });
        }

        // Determine which file to download
        let fileId: mongoose.Types.ObjectId;
        let filename: string;
        let mimetype: string;

        if (fileType === "image" && post.original_images && post.original_images.length > 0) {
            // Download specific original image
            const index = parseInt(imageIndex || "0");
            if (index >= post.original_images.length) {
                return NextResponse.json({ message: "Image not found" }, { status: 404 });
            }

            const image = post.original_images[index];
            fileId = image.file_id;
            filename = image.filename;
            mimetype = image.mimetype;
        } else if (post.original_file) {
            // Download original document
            fileId = post.original_file.file_id;
            filename = post.original_file.filename;
            mimetype = post.original_file.mimetype;
        } else {
            return NextResponse.json({ message: "No file available for download" }, { status: 404 });
        }

        try {
            await getFileInfo(fileId);
        } catch (err) {
            return NextResponse.json({ message: "File not found in storage" }, { status: 404 });
        }

        const stream = streamFileToResponse(fileId);

        console.log(`[INFO] File downloaded: ${filename} from post ${id} by ${profile.name}`);

        return new Response(stream, {
            headers: {
                "Content-Type": mimetype,
                "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (error) {
        console.error("[ERROR] Download file error:", error);
        return NextResponse.json({ message: "Failed to download file" }, { status: 500 });
    }
}
