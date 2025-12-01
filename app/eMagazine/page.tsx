"use client";

import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
    ssr: false,
    loading: () => <p className="text-center p-10">Initializing PDF Viewer...</p>,
});

export default async function PublicDocPage({ params }: { params: { id: string } }) {
    // 1. Fetch document metadata (simulated)
    // const doc = await getDocumentById(params.id);

    // MOCK DATA for demonstration
    const doc = {
        status: "PUBLISHED",
        finalPdfUrl: process.env.EMAGAZINE_BLOB_URL || "",
        title: "Project Specification v2",
    };

    if (!doc || doc.status !== "PUBLISHED") {
        return notFound(); // Security: Only show if PUBLISHED
    }

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-5xl mx-auto py-8">
                <h1 className="text-2xl font-bold mb-6 text-center">{doc.title}</h1>
                {/* Pass the blob URL to the client viewer */}
                <PDFViewer url={doc.finalPdfUrl} />
            </div>
        </main>
    );
}
