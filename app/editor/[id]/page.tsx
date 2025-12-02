"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute } from "@/contexts/AuthContext";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Download,
    Eye,
    FileIcon,
    ImageIcon,
    Loader2,
    Upload,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

// Dynamic import for PDF Viewer to avoid SSR issues
const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full" />,
});

async function fetcher(url: string) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
}

export default function EditorReviewPage() {
    return (
        <ProtectedRoute allowedRoles={["editor", "admin"]}>
            <EditorReviewContent />
        </ProtectedRoute>
    );
}

function EditorReviewContent() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: postData, isLoading, error } = useSWR(`/api/posts/${id}`, fetcher);

    const post = postData?.post;
    const [rejectionReason, setRejectionReason] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [designFiles, setDesignFiles] = useState<File[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [showPdfPreview, setShowPdfPreview] = useState(false); // Toggle preview

    const handleReview = async (action: "accept" | "reject") => {
        setReviewLoading(true);
        try {
            const body =
                action === "accept"
                    ? { action: "accept" }
                    : {
                          action: "reject",
                          rejection_reason: rejectionReason || "Please revise and resubmit",
                      };

            const res = await fetch(`/api/posts/${id}/review`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Review failed");

            toast.success(`Post ${action}ed successfully`);
            router.push("/editor");
        } catch (error) {
            toast.error("Failed to review post");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleUploadDesigned = async () => {
        if (designFiles.length === 0) {
            toast.error("Please select design files");
            return;
        }

        setUploadLoading(true);
        try {
            const formData = new FormData();
            designFiles.forEach(file => formData.append("designs", file));

            const res = await fetch(`/api/posts/${id}/design`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            toast.success("Design files uploaded successfully");
            setDesignFiles([]);
        } catch (error) {
            toast.error("Failed to upload design files");
        } finally {
            setUploadLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 p-8">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium mb-2">Error loading post</p>
                <p className="text-muted-foreground mb-4">{error.message}</p>
                <Button asChild>
                    <Link href="/editor">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-12 p-8">
                <p className="text-muted-foreground mb-4">Post not found</p>
                <Button asChild>
                    <Link href="/editor">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    // Determine if we can preview
    const isPdf = post.original_file?.mimetype === "application/pdf";
    // Construct proxy URL for CORS safety if needed, or use direct blob URL
    // Using proxy is safer for react-pdf
    const previewUrl = post.original_file?.url
        ? `/api/emagazine?url=${encodeURIComponent(post.original_file.url)}`
        : "";

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Button asChild variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                        <Link href="/editor">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
                </div>
                <Badge className="h-fit capitalize px-3 py-1 text-sm font-medium">
                    {post.status.replace("_", " ")}
                </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Column: Details & Actions */}
                <div className="md:col-span-2 space-y-6">
                    {/* Content Preview (Text) */}
                    {post.raw_content && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Content Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto border">
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.raw_content}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* PDF Preview (NEW) */}
                    {isPdf && showPdfPreview && (
                        <Card className="overflow-hidden border-2 border-blue-100">
                            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
                                <CardTitle className="text-base">Document Preview</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setShowPdfPreview(false)}>
                                    Close Preview
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden bg-slate-100 min-h-[500px]">
                                <PDFViewer url={previewUrl} />
                            </CardContent>
                        </Card>
                    )}

                    {/* Source Files */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Source Files</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Original Document */}
                            {post.original_file?.url && (
                                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                            <FileIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{post.original_file.filename}</p>
                                            <p className="text-xs text-slate-500">
                                                {(post.original_file.size / 1024 / 1024).toFixed(2)} MB
                                                <span className="mx-1">•</span>
                                                {new Date(post.original_file.uploaded_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* PREVIEW BUTTON */}
                                        {post.original_file.mimetype === "application/pdf" && (
                                            <Button
                                                size="sm"
                                                variant={showPdfPreview ? "secondary" : "default"}
                                                onClick={() => setShowPdfPreview(!showPdfPreview)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                {showPdfPreview ? "Hide" : "Preview"}
                                            </Button>
                                        )}

                                        <Button asChild size="sm" variant="outline">
                                            <a
                                                href={post.original_file.url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Original Images - Display them inline */}
                            {post.original_images?.length > 0 && (
                                <div className="space-y-4">
                                    <p className="text-sm font-medium text-muted-foreground">Submitted Images</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {post.original_images.map((img: any, i: number) => (
                                            <div
                                                key={i}
                                                className="border rounded-lg overflow-hidden group relative aspect-video bg-slate-100"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={img.url}
                                                    alt={img.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Button asChild size="sm" variant="secondary">
                                                        <a href={img.url} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                    <Button asChild size="sm" variant="secondary">
                                                        <a
                                                            href={img.url}
                                                            download
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!post.original_file?.url &&
                                (!post.original_images || post.original_images.length === 0) &&
                                !post.raw_content && (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed">
                                        <FileIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">
                                            No source files available for this submission.
                                        </p>
                                    </div>
                                )}
                        </CardContent>
                    </Card>

                    {/* Review Actions */}
                    {post.status === "PENDING_REVIEW" && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Review Decision</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            Rejection Reason (Optional)
                                        </label>
                                        <Textarea
                                            placeholder="If rejecting, please explain why to help the author improve..."
                                            value={rejectionReason}
                                            onChange={e => setRejectionReason(e.target.value)}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        <Button
                                            onClick={() => handleReview("accept")}
                                            disabled={reviewLoading}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            {reviewLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    Accept & Start Design
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => handleReview("reject")}
                                            disabled={reviewLoading}
                                            variant="destructive"
                                            className="flex-1"
                                        >
                                            {reviewLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    Reject
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Design Upload */}
                    {(post.status === "ACCEPTED" ||
                        post.status === "DESIGNING" ||
                        post.status === "ADMIN_REJECTED") && (
                        <Card className="border-blue-200 bg-blue-50/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-800">
                                    <Upload className="w-5 h-5" />
                                    Upload Designed Version
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors bg-white">
                                    <input
                                        type="file"
                                        onChange={e => setDesignFiles(Array.from(e.target.files || []))}
                                        accept=".jpg,.jpeg,.png,.pdf,.docx"
                                        multiple
                                        className="hidden"
                                        id="designs-input"
                                    />
                                    <label htmlFor="designs-input" className="cursor-pointer w-full h-full block">
                                        <Upload className="w-10 h-10 mx-auto mb-3 text-blue-500" />
                                        <p className="text-sm font-medium text-slate-900">
                                            {designFiles.length > 0
                                                ? `${designFiles.length} file(s) selected`
                                                : "Click to select designed files"}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Images or PDFs (Max 20MB)</p>
                                    </label>
                                </div>
                                <Button
                                    onClick={handleUploadDesigned}
                                    disabled={uploadLoading || designFiles.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {uploadLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        "Submit Design for Admin Review"
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Metadata */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submission Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Author</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {post.author?.name?.charAt(0) || "U"}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{post.author?.name}</p>
                                        <p className="text-xs text-muted-foreground">{post.author?.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-slate-100 my-2" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                                    <Badge variant="outline" className="capitalize bg-slate-50">
                                        {post.category || "Uncategorized"}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Type</p>
                                    <p className="font-medium text-sm capitalize flex items-center gap-1">
                                        {post.submission_type === "upload" && <FileIcon className="w-3 h-3" />}
                                        {post.submission_type === "paste" && <FileIcon className="w-3 h-3" />}
                                        {post.submission_type === "image_upload" && <ImageIcon className="w-3 h-3" />}
                                        {post.submission_type?.replace("_", " ")}
                                    </p>
                                </div>
                            </div>
                            <div className="h-px bg-slate-100 my-2" />
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Submitted On</p>
                                <p className="font-medium text-sm">
                                    {new Date(post.created_at).toLocaleDateString(undefined, { dateStyle: "full" })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(post.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
