"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// IMPORTANT: Must use local worker file - copy it first with:
// cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
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

    const onResize = useCallback(() => {
        if (containerRef.current) {
            const width = containerRef.current.clientWidth;
            setContainerWidth(width);
            if (width < 768) {
                setScale(1);
            } else if (width < 1024) {
                setScale(1.2);
            } else {
                setScale(1);
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
        setError("Failed to load document");
    }

    return (
        <div className={cn("w-full bg-white", className)}>
            {/* Loading State */}
            {loading && !error && (
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <Loader2 className="h-12 w-12 animate-spin text-slate-400 mb-4" />
                    <p className="text-slate-600">Loading magazine...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <p className="text-slate-600">{error}</p>
                </div>
            )}

            {/* PDF Pages - Continuous Scroll - Full Width */}
            <div ref={containerRef} className="w-full">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="w-full"
                >
                    {containerWidth > 0 && !loading && !error && (
                        <div className="w-full flex flex-col">
                            {Array.from(new Array(numPages), (el, index) => (
                                <Page
                                    key={`page_${index + 1}`}
                                    pageNumber={index + 1}
                                    width={containerWidth}
                                    scale={scale}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="w-full"
                                    loading={
                                        <div className="flex items-center justify-center h-screen">
                                            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                        </div>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </Document>
            </div>
        </div>
    );
}
