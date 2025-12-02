"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute } from "@/contexts/AuthContext";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileIcon, ImageIcon, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

async function fetcher(url: string) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
}

export default function EditorReviewPage() {
    return (
        <ProtectedRoute>
            <EditorReviewContent />
        </ProtectedRoute>
    );
}

function EditorReviewContent() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: postData, isLoading } = useSWR(`/api/posts/${id}`, fetcher);

    const post = postData?.post;
    const [rejectionReason, setRejectionReason] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [designFiles, setDesignFiles] = useState<File[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);

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
            // Ideally refresh data here
        } catch (error) {
            toast.error("Failed to upload design files");
        } finally {
            setUploadLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Post not found</p>
                <Button asChild>
                    <Link href="/editor">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Button asChild variant="ghost" className="mb-4">
                        <Link href="/editor">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">{post.title}</h1>
                </div>
                <Badge className="h-fit capitalize">{post.status.replace("_", " ")}</Badge>
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
                                <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                                    <p className="text-sm whitespace-pre-wrap">{post.raw_content}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Source Files (NEW SECTION) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Source Files</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Original Document */}
                            {post.original_file?.url && (
                                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded text-blue-600">
                                            <FileIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{post.original_file.filename}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(post.original_file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
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
                            )}

                            {/* Original Images */}
                            {post.original_images?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Submitted Images</p>
                                    <div className="grid gap-2">
                                        {post.original_images.map((img: any, i: number) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-100 rounded text-purple-600">
                                                        <ImageIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{img.filename}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(img.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button asChild size="sm" variant="outline">
                                                    <a
                                                        href={img.url}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!post.original_file?.url &&
                                (!post.original_images || post.original_images.length === 0) &&
                                !post.raw_content && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No source files available.
                                    </p>
                                )}
                        </CardContent>
                    </Card>

                    {/* Review Actions */}
                    {post.status === "PENDING_REVIEW" && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Rejection Reason</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        placeholder="If rejecting, please explain why..."
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        rows={3}
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex gap-4">
                                <Button
                                    onClick={() => handleReview("accept")}
                                    disabled={reviewLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
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
                        </div>
                    )}

                    {/* Design Upload (Only if Accepted) */}
                    {post.status === "ACCEPTED" || post.status === "DESIGNING" || post.status === "ADMIN_REJECTED" ? (
                        <Card className="border-blue-200 bg-blue-50/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-blue-600" />
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
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                        <p className="text-sm font-medium text-blue-900">
                                            {designFiles.length > 0
                                                ? `${designFiles.length} file(s) selected`
                                                : "Click to select designed files"}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">Images or PDFs (Max 20MB)</p>
                                    </label>
                                </div>
                                <Button
                                    onClick={handleUploadDesigned}
                                    disabled={uploadLoading || designFiles.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
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
                    ) : null}
                </div>

                {/* Right Column: Metadata */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Submission Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Author</p>
                                <p className="font-medium">{post.author?.name}</p>
                                <p className="text-xs text-muted-foreground">{post.author?.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Category</p>
                                    <p className="font-medium capitalize">{post.category}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Type</p>
                                    <p className="font-medium capitalize">{post.submission_type}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Submitted</p>
                                <p className="font-medium">{new Date(post.created_at).toLocaleDateString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
