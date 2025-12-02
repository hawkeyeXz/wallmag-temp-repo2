import Post from "@/app/models/Post";
import { requirePermission } from "@/lib/auth/permissions";
import { dbConnect } from "@/lib/mongoose";
import JSZip from "jszip";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        // 1. Permission Check
        const { error } = await requirePermission("download_original_files");
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "PENDING_REVIEW";
        const id = searchParams.get("id"); // New parameter for single download

        // --- SINGLE FILE DOWNLOAD ---
        if (id) {
            const post = await Post.findById(id).select("title author_name original_file");

            if (!post || !post.original_file?.url) {
                return NextResponse.json({ message: "File not found" }, { status: 404 });
            }

            // Fetch the file from Vercel Blob
            const response = await fetch(post.original_file.url);
            if (!response.ok) {
                return NextResponse.json({ message: "Failed to fetch file from storage" }, { status: 502 });
            }

            // Construct filename
            const extension = post.original_file.filename.split(".").pop();
            const safeTitle = post.title.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
            const safeAuthor = post.author_name.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
            const filename = `${safeTitle}_by_${safeAuthor}.${extension}`;

            // Return file stream directly with attachment header to FORCE download
            return new NextResponse(response.body, {
                headers: {
                    "Content-Type": post.original_file.mimetype || "application/octet-stream",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        // --- BULK DOWNLOAD (ZIP) ---
        const posts = await Post.find({
            status: status,
            "original_file.url": { $exists: true },
        }).select("title author_name original_file");

        if (!posts || posts.length === 0) {
            return NextResponse.json({ message: "No files found to download" }, { status: 404 });
        }

        const zip = new JSZip();
        const folderName = `submissions-${status}-${new Date().toISOString().split("T")[0]}`;
        const folder = zip.folder(folderName);

        // Fetch all files in parallel
        await Promise.all(
            posts.map(async (post: any) => {
                if (!post.original_file?.url) return;

                try {
                    const response = await fetch(post.original_file.url);
                    if (!response.ok) return;

                    const arrayBuffer = await response.arrayBuffer();
                    const extension = post.original_file.filename.split(".").pop();
                    const safeTitle = post.title.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
                    const safeAuthor = post.author_name.replace(/[^a-z0-9]/gi, "_").substring(0, 30);
                    const filename = `${safeTitle}_by_${safeAuthor}.${extension}`;

                    folder?.file(filename, arrayBuffer);
                } catch (err) {
                    console.error(`Failed to download file for post ${post._id}`, err);
                }
            })
        );

        const zipContent = await zip.generateAsync({ type: "blob" });
        const buffer = Buffer.from(await zipContent.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename=submissions-${status}.zip`,
            },
        });
    } catch (error) {
        console.error("[ERROR] Download failed:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
