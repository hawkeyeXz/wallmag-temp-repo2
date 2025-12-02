"use client";

import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
    ssr: false,
    loading: () => <p className="text-center p-10">Initializing PDF Viewer...</p>,
});

export default function PDFViewerWrapper({ url }: { url: string }) {
    return <PDFViewer url={url} />;
}
