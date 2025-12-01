"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// 1. Configure the worker (Essential for performance)
// We use a CDN to avoid bundling the massive worker file in your main chunk.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    url: string; // The public Vercel Blob URL
}

export default function PDFViewer({ url }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [loading, setLoading] = useState(true);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
            {/* Controls */}
            <div className="mb-4 flex gap-4 items-center bg-white p-2 rounded-lg shadow-sm">
                <button
                    onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                    disabled={pageNumber <= 1}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-sm font-medium">
                    Page {pageNumber} of {numPages || "--"}
                </span>
                <button
                    onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                    disabled={pageNumber >= numPages}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            {/* PDF Render Area */}
            <div className="max-w-4xl w-full border border-gray-200 shadow-lg bg-white overflow-auto flex justify-center">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={error => console.error("Error loading PDF:", error)}
                    loading={<div className="h-96 flex items-center justify-center text-gray-500">Loading PDF...</div>}
                    className="flex flex-col items-center"
                >
                    <Page
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={true} // Links work
                        width={Math.min(800, typeof window !== "undefined" ? window.innerWidth - 40 : 800)} // Responsive width
                        className="shadow-sm"
                    />
                </Document>
            </div>
        </div>
    );
}
