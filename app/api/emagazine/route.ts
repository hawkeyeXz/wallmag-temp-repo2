import { NextResponse } from "next/server";
export async function GET() {
    const pdfUrl = process.env.EMAGAZINE_BLOB_URL;

    if (!pdfUrl) {
        return NextResponse.json({ error: "EMAGAZINE_BLOB_URL is not configured" }, { status: 500 });
    }

    return NextResponse.json({
        title: "Complete API Documentation",
        url: pdfUrl,
    });
}
