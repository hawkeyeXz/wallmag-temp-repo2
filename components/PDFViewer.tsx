"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFViewerProps {
    url: string;
    className?: string;
}

export default function PDFViewer({ url, className }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [scale, setScale] = useState<number>(1);

    const containerRef = useRef<HTMLDivElement>(null);

    // Smart scaling based on container width
    const onResize = useCallback(() => {
        if (containerRef.current) {
            const width = containerRef.current.clientWidth;
            setContainerWidth(width);
            if (width < 768) {
                setScale(width > 400 ? 0.9 : 0.6); // Mobile adjustment
            } else if (width < 1024) {
                setScale(1.0);
            } else {
                setScale(1.2); // Larger screens
            }
        }
    }, []);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(onResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, [onResize]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
    }

    function onDocumentLoadError(err: Error) {
        console.error("PDF Load Error:", err);
        setLoading(false);
        setError("Failed to load document. It may be restricted or deleted.");
    }

    return (
        <div className={cn("w-full bg-white flex flex-col items-center min-h-[500px]", className)}>
            {/* Loading Spinner */}
            {loading && !error && (
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                    <p className="text-sm text-muted-foreground">Loading magazine...</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                    <p className="text-xs text-muted-foreground mt-2">Try refreshing the page.</p>
                </div>
            )}

            {/* PDF Document */}
            <div ref={containerRef} className="w-full max-w-4xl shadow-xl">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="flex flex-col items-center"
                    error={null} // Handle error via callback
                >
                    {containerWidth > 0 && !loading && !error && (
                        <div className="w-full flex flex-col gap-4 py-4 bg-gray-50 items-center">
                            {Array.from(new Array(numPages), (el, index) => (
                                <Page
                                    key={`page_${index + 1}`}
                                    pageNumber={index + 1}
                                    width={containerWidth}
                                    scale={scale}
                                    renderTextLayer={false} // Disable text layer for performance if selection not needed
                                    renderAnnotationLayer={false}
                                    className="shadow-md"
                                    loading={<div className="h-[800px] w-full bg-white animate-pulse" />}
                                />
                            ))}
                        </div>
                    )}
                </Document>
            </div>
        </div>
    );
}
