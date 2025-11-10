"use client"

import { ProtectedRoute, useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { Eye, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

const statusColors: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  DESIGNING: "bg-purple-100 text-purple-800",
  AWAITING_ADMIN: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  PUBLISHED: "bg-cyan-100 text-cyan-800",
}

export default function MyPostsPage() {
  return (
    <ProtectedRoute>
      <MyPostsContent />
    </ProtectedRoute>
  )
}

function MyPostsContent() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading, mutate } = useSWR(
    `/api/posts/my-posts?status=${statusFilter}&page=${page}&limit=10`,
    fetcher,
  )

  const posts = data?.posts || []
  const stats = data?.stats || {}
  const pagination = data?.pagination || {}

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) throw new Error("Delete failed")

      toast.success("Post deleted successfully")
      mutate()
      setDeleteId(null)
    } catch (error) {
      toast.error("Failed to delete post")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Posts</h1>
          <p className="text-muted-foreground">Manage your submissions</p>
        </div>
        <Button asChild>
          <Link href="/contribute">New Post</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total || 0 },
          { label: "Pending", value: stats.pending || 0 },
          { label: "Accepted", value: stats.accepted || 0 },
          { label: "Rejected", value: stats.rejected || 0 },
          { label: "Published", value: stats.published || 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Submissions</CardTitle>
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
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post: any) => (
                    <TableRow key={post._id}>
                      <TableCell className="font-medium max-w-xs truncate">{post.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {post.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[post.status]}>{post.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(post.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {post.status === "PUBLISHED" && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/post/${post._id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        {["PENDING_REVIEW", "REJECTED"].includes(post.status) && (
                          <Button
                            onClick={() => handleDelete(post._id)}
                            disabled={deleting && deleteId === post._id}
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            {deleting && deleteId === post._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No posts yet</p>
              <Button asChild>
                <Link href="/contribute">Create Your First Post</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
