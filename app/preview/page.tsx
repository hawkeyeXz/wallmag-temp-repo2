"use client";

import PDFViewer from "@/components/PDFViewer"; // Directly import your existing component
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/contexts/AuthContext";
import { AlertCircle, ArrowLeft, Download, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PreviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const rawUrl = searchParams.get("url");
    const title = searchParams.get("title") || "Document Preview";

    if (!rawUrl) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
                <div className="p-4 bg-white rounded-full shadow-sm">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">No document specified</h1>
                <p className="text-gray-500">The preview link seems to be invalid or missing a URL.</p>
                <Button onClick={() => router.back()} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    // Use proxy route to handle CORS issues if needed
    // If your PDFViewer component handles fetching internally, you might pass rawUrl directly.
    // Assuming we stick to the safe proxy pattern:
    const pdfUrl = rawUrl.startsWith("/") ? rawUrl : `/api/emagazine?url=${encodeURIComponent(rawUrl)}`;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header / Toolbar */}
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-600">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <h1 className="font-medium text-slate-900 truncate max-w-md" title={title}>
                        {title}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                        <a href={rawUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            Download Original
                        </a>
                    </Button>
                </div>
            </header>

            {/* Viewer Container */}
            <main className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
                <div className="w-full max-w-5xl bg-white shadow-xl rounded-xl overflow-hidden min-h-[80vh] border border-slate-200">
                    <PDFViewer url={pdfUrl} />
                </div>
            </main>
        </div>
    );
}

export default function PreviewPage() {
    return (
        <ProtectedRoute allowedRoles={["editor", "admin", "publisher"]}>
            <Suspense
                fallback={
                    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                }
            >
                <PreviewContent />
            </Suspense>
        </ProtectedRoute>
    );
}
