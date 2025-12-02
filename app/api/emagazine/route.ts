import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new NextResponse(blob, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
    }
}
