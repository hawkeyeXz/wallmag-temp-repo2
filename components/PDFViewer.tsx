"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFViewerProps {
    url: string;
    className?: string;
}

export default function PDFViewer({ url, className }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [scale, setScale] = useState<number>(1);
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

    const containerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const onResize = useCallback(() => {
        if (containerRef.current) {
            const width = containerRef.current.clientWidth;
            setContainerWidth(width);

            if (width < 768) {
                setScale(1.06);
            } else if (width < 1024) {
                setScale(1.2);
            } else {
                setScale(1);
            }
        }
    }, []);

    useEffect(() => {
        onResize();
        const resizeObserver = new ResizeObserver(onResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, [onResize]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        console.log("✅ PDF loaded:", numPages, "pages");
        setNumPages(numPages);
        // Initially show first 10 pages
        setVisiblePages(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    }

    // Setup intersection observer after document loads
    useEffect(() => {
        if (!numPages) return;

        const observer = new IntersectionObserver(
            entries => {
                setVisiblePages(prev => {
                    const newSet = new Set(prev);

                    entries.forEach(entry => {
                        const pageNum = parseInt(entry.target.getAttribute("data-page-number") || "0");

                        if (entry.isIntersecting && pageNum > 0) {
                            // Add this page and neighbors
                            newSet.add(pageNum);
                            if (pageNum > 1) newSet.add(pageNum - 1);
                            if (pageNum < numPages) newSet.add(pageNum + 1);
                        }
                    });

                    return newSet;
                });
            },
            {
                rootMargin: "400px",
                threshold: 0,
            }
        );

        observerRef.current = observer;

        // Wait a bit for DOM to render, then observe
        setTimeout(() => {
            document.querySelectorAll("[data-page-number]").forEach(el => {
                observer.observe(el);
            });
        }, 100);

        return () => observer.disconnect();
    }, [numPages]);

    return (
        <div className={cn("w-full bg-white", className)}>
            <div ref={containerRef} className="w-full">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={err => console.error("PDF Error:", err)}
                    loading={
                        <div className="flex flex-col items-center justify-center min-h-screen">
                            <Loader2 className="h-12 w-12 animate-spin text-slate-400 mb-4" />
                            <p className="text-slate-600">Loading magazine...</p>
                        </div>
                    }
                    error={
                        <div className="flex flex-col items-center justify-center min-h-screen">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                            <p className="text-slate-600">Failed to load PDF</p>
                        </div>
                    }
                >
                    {numPages > 0 && containerWidth > 0 && (
                        <div className="w-full flex flex-col">
                            {Array.from({ length: numPages }, (_, i) => {
                                const pageNumber = i + 1;
                                const isVisible = visiblePages.has(pageNumber);

                                return (
                                    <div
                                        key={`page_${pageNumber}`}
                                        data-page-number={pageNumber}
                                        className="w-full min-h-[1000px] flex items-center justify-center"
                                    >
                                        {isVisible ? (
                                            <Page
                                                pageNumber={pageNumber}
                                                width={containerWidth}
                                                scale={scale}
                                                renderTextLayer={true}
                                                renderAnnotationLayer={true}
                                                loading={
                                                    <div className="h-[1000px] flex items-center justify-center">
                                                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                                    </div>
                                                }
                                            />
                                        ) : (
                                            <div className="h-[1000px] flex items-center justify-center bg-gray-50">
                                                <p className="text-gray-400">Page {pageNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Document>
            </div>
        </div>
    );
}
