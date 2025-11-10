"use client"

import { ProtectedRoute, useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

const statusColors: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  DESIGNING: "bg-purple-100 text-purple-800",
  ADMIN_REJECTED: "bg-red-100 text-red-800",
}

export default function EditorPage() {
  return (
    <ProtectedRoute>
      <EditorDashboard />
    </ProtectedRoute>
  )
}

function EditorDashboard() {
  const { user } = useAuth()
  const [status, setStatus] = useState("PENDING_REVIEW")
  const [page, setPage] = useState(1)

  const { data, isLoading, mutate } = useSWR(
    `/api/posts/editor/pending?status=${status}&page=${page}&limit=10`,
    fetcher,
  )

  const posts = data?.posts || []
  const stats = data?.stats || {}
  const categoryStats = data?.category_stats || {}

  const handleReview = async (postId: string, action: "accept" | "reject") => {
    try {
      const body =
        action === "accept"
          ? { action: "accept" }
          : {
              action: "reject",
              rejection_reason: "Please revise and resubmit",
            }

      const res = await fetch(`/api/posts/${postId}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Review failed")

      toast.success(`Post ${action}ed`)
      mutate()
    } catch (error) {
      toast.error("Failed to review post")
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Editor Dashboard</h1>
        <p className="text-muted-foreground">Review and manage submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: stats.pending_review || 0 },
          { label: "Accepted", value: stats.accepted || 0 },
          { label: "Designing", value: stats.designing || 0 },
          { label: "Admin Rejected", value: stats.admin_rejected || 0 },
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

      {/* Category Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown (Pending)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(categoryStats).map(([category, count]) => (
              <div key={category} className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{count as any}</p>
                <p className="text-sm text-muted-foreground capitalize">{category}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post: any) => (
                    <TableRow key={post._id}>
                      <TableCell className="font-medium max-w-xs truncate">{post.title}</TableCell>
                      <TableCell className="text-sm">{post.author?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {post.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{post.submission_type}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[post.status]}>{post.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/editor/${post._id}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No submissions to review</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
