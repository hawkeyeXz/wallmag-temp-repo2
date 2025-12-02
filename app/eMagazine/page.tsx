import PDFViewerWrapper from "@/components/PDFViewerWrapper";

export default async function PublicDocPage() {
    const doc = {
        finalPdfUrl: `/api/emagazine?url=${encodeURIComponent(
            process.env.EMAGAZINE_BLOB_URL ||
                "https://e4xpii843ilwjk9n.public.blob.vercel-storage.com/Complete%20API%20Documentation-GiHgfIIEVVXv54SqJmbSdT573Xz952.pdf"
        )}`,
        title: "Apodartho Annual Edition 2024",
    };

    return (
        <main className="w-full bg-white p-0 m-0">
            {/* Absolutely no padding or margins - edge to edge */}
            <PDFViewerWrapper url={doc.finalPdfUrl} />
        </main>
    );
}
