"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Download, FileText, RefreshCw, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

async function fetcher(url: string) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
}

const statusColors: Record<string, string> = {
    AWAITING_ADMIN: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    PUBLISHED: "bg-blue-100 text-blue-800",
};

export default function AdminPage() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
        </ProtectedRoute>
    );
}

function AdminDashboard() {
    const { user } = useAuth();
    const [status, setStatus] = useState("AWAITING_ADMIN");
    const [page, setPage] = useState(1);
    const [downloading, setDownloading] = useState(false);

    const { data, isLoading, mutate } = useSWR(
        `/api/posts/admin/awaiting?status=${status}&page=${page}&limit=10`,
        fetcher
    );

    const { data: analyticsData } = useSWR(`/api/admin/analytics?period=30`, fetcher);

    const posts = data?.posts || [];
    const stats = data?.stats || {};
    const analytics = analyticsData?.overview || {};

    const handleDownload = async (id?: string) => {
        setDownloading(true);
        const toastId = toast.loading("Preparing download...");
        try {
            const query = id ? `id=${id}` : `status=${status}`;
            const res = await fetch(`/api/download?${query}`);

            if (!res.ok) throw new Error("Download failed");

            // Extract filename from header
            const disposition = res.headers.get("Content-Disposition");
            let filename = id ? `submission-${id}` : `submissions-${status}.zip`;

            if (disposition && disposition.includes("attachment")) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, "");
                }
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename; // Use correct filename from server
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Download started", { id: toastId });
        } catch (error) {
            toast.error("Failed to download file(s)", { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage posts and platform analytics</p>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Posts", value: analytics.total_posts || 0, icon: FileText },
                    { label: "Published", value: analytics.published_posts || 0, icon: CheckCircle2 },
                    { label: "Total Users", value: analytics.total_users || 0, icon: Users },
                    { label: "Awaiting Review", value: stats.awaiting_admin || 0, icon: TrendingUp },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.label}
                                    </CardTitle>
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="AWAITING_ADMIN">Awaiting Admin</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="PUBLISHED">Published</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => mutate()}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => handleDownload()}
                    disabled={downloading || posts.length === 0}
                >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? "Zipping..." : "Download All Files"}
                </Button>
            </div>

            {/* Posts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : posts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Editor</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {posts.map((post: any) => (
                                        <TableRow key={post._id}>
                                            <TableCell className="font-medium max-w-xs truncate">
                                                {post.title}
                                            </TableCell>
                                            <TableCell className="text-sm">{post.author?.name}</TableCell>
                                            <TableCell className="text-sm">{post.reviewed_by?.name || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {post.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[post.status]}>{post.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDownload(post._id)}
                                                                >
                                                                    <Download className="w-4 h-4 text-slate-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Download Files</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/admin/${post._id}`}>Review</Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No posts matching filter</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
