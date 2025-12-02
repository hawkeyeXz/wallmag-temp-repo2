"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute } from "@/contexts/AuthContext";
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, ExternalLink, FileIcon, Loader2 } from "lucide-react";
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

export default function AdminReviewPage() {
    return (
        <ProtectedRoute>
            <AdminReviewContent />
        </ProtectedRoute>
    );
}

function AdminReviewContent() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: postData, isLoading, mutate } = useSWR(`/api/posts/${id}`, fetcher);

    const post = postData?.post;
    const [rejectionReason, setRejectionReason] = useState("");
    const [featuredUntil, setFeaturedUntil] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);

    const handleReview = async (action: "approve" | "reject") => {
        setReviewLoading(true);
        try {
            const body =
                action === "approve"
                    ? { action: "approve" }
                    : {
                          action: "reject",
                          rejection_reason: rejectionReason || "Please revise design",
                      };

            const res = await fetch(`/api/posts/${id}/approve`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Review failed");

            toast.success(`Post ${action}ed successfully`);
            mutate();
        } catch (error) {
            toast.error("Failed to review post");
        } finally {
            setReviewLoading(false);
        }
    };

    const handlePublish = async () => {
        setPublishLoading(true);
        try {
            const body: any = { action: "publish" };
            if (featuredUntil) {
                body.featured_until = new Date(featuredUntil).toISOString();
            }

            const res = await fetch(`/api/posts/${id}/publish`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Publish failed");

            toast.success("Post published successfully");
            router.push("/admin");
        } catch (error) {
            toast.error("Failed to publish post");
        } finally {
            setPublishLoading(false);
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
                    <Link href="/admin">Back to Dashboard</Link>
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
                        <Link href="/admin">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">{post.title}</h1>
                </div>
                <Badge className="h-fit capitalize">{post.status.replace("_", " ")}</Badge>
            </div>

            {/* Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Submission Details</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Author</p>
                        <p className="font-medium">{post.author?.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium capitalize">{post.category}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Editor</p>
                        <p className="font-medium">{post.reviewed_by?.name || "Not assigned"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Designed Files</p>
                        <p className="font-medium">{post.designed_files?.length || 0} files</p>
                    </div>
                </CardContent>
            </Card>

            {/* Designed Files Preview */}
            {post.designed_files && post.designed_files.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Designed Files (Ready for Review)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            {post.designed_files.map((file: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium text-sm">{file.filename}</p>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                <span>•</span>
                                                <span>Version {file.version}</span>
                                                {file.is_current && (
                                                    <Badge variant="secondary" className="h-4 text-[10px] px-1">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        {/* FIXED: Directly link to Vercel Blob URL */}
                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-3 h-3 mr-2" />
                                            View File
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Design Review (if AWAITING_ADMIN) */}
            {post.status === "AWAITING_ADMIN" && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Decision</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="If rejecting, please explain what needs to be fixed..."
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                rows={3}
                            />

                            <div className="flex gap-4">
                                <Button
                                    onClick={() => handleReview("approve")}
                                    disabled={reviewLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {reviewLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Approve Design
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
                                            Reject Design
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Publish (if APPROVED) */}
            {post.status === "APPROVED" && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Publish Post
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Featured Until (Optional)</label>
                            <Input
                                type="date"
                                className="bg-white"
                                value={featuredUntil}
                                onChange={e => setFeaturedUntil(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty to publish without featured status. Featured posts appear at the top.
                            </p>
                        </div>
                        <Button
                            onClick={handlePublish}
                            disabled={publishLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {publishLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Publish Live
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
