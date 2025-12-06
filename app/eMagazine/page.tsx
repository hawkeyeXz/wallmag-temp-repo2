import PDFViewerWrapper from "@/components/PDFViewerWrapper";

export default async function PublicDocPage() {
    const doc = {
        finalPdfUrl: process.env.EMAGAZINE_BLOB_URL as string,
        title: "Apodartho Annual Edition 2024",
    };

    return (
        <main className="w-full bg-white p-0 m-0">
            {/* Absolutely no padding or margins - edge to edge */}
            <PDFViewerWrapper url={doc.finalPdfUrl} />
        </main>
    );
}
