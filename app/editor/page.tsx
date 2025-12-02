"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

async function fetcher(url: string) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
}

const statusColors: Record<string, string> = {
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200",
    DESIGNING: "bg-purple-100 text-purple-800 border-purple-200",
    ADMIN_REJECTED: "bg-red-100 text-red-800 border-red-200",
};

export default function EditorPage() {
    return (
        <ProtectedRoute>
            <EditorDashboard />
        </ProtectedRoute>
    );
}

function EditorDashboard() {
    const { user } = useAuth();
    const [status, setStatus] = useState("PENDING_REVIEW");
    const [page, setPage] = useState(1);

    // This endpoint needs to be created/updated in step 5
    const { data, isLoading, mutate } = useSWR(
        `/api/posts/editor/pending?status=${status}&page=${page}&limit=10`,
        fetcher
    );

    const posts = data?.posts || [];
    const stats = data?.stats || {};
    const categoryStats = data?.category_stats || {};

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editor Dashboard</h1>
                    <p className="text-muted-foreground">Review submissions and manage designs</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Pending Review", value: stats.pending_review || 0, color: "text-yellow-600" },
                    { label: "Accepted", value: stats.accepted || 0, color: "text-blue-600" },
                    { label: "Designing", value: stats.designing || 0, color: "text-purple-600" },
                    { label: "Admin Rejected", value: stats.admin_rejected || 0, color: "text-red-600" },
                ].map(stat => (
                    <Card key={stat.label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                        <SelectItem value="DESIGNING">Designing</SelectItem>
                        <SelectItem value="ADMIN_REJECTED">Admin Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Posts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Submissions Queue</CardTitle>
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
                                        <TableHead>Category</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {posts.map((post: any) => (
                                        <TableRow key={post._id}>
                                            <TableCell
                                                className="font-medium max-w-[200px] truncate"
                                                title={post.title}
                                            >
                                                {post.title}
                                            </TableCell>
                                            <TableCell className="text-sm">{post.author_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {post.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm capitalize">{post.submission_type}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={statusColors[post.status]}>
                                                    {post.status.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="default" size="sm">
                                                    <Link href={`/editor/${post._id}`}>
                                                        {post.status === "PENDING_REVIEW" ? "Review" : "Manage"}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No submissions found with status: {status}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
