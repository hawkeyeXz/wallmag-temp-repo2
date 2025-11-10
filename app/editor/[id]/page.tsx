"use client"

import { ProtectedRoute } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle2, Upload, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function EditorReviewPage() {
  return (
    <ProtectedRoute>
      <EditorReviewContent />
    </ProtectedRoute>
  )
}

function EditorReviewContent() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: postData, isLoading } = useSWR(`/api/posts/${id}`, fetcher)

  const post = postData?.post
  const [rejectionReason, setRejectionReason] = useState("")
  const [reviewLoading, setReviewLoading] = useState(false)
  const [designFiles, setDesignFiles] = useState<File[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)

  const handleReview = async (action: "accept" | "reject") => {
    setReviewLoading(true)
    try {
      const body =
        action === "accept"
          ? { action: "accept" }
          : {
              action: "reject",
              rejection_reason: rejectionReason || "Please revise and resubmit",
            }

      const res = await fetch(`/api/posts/${id}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Review failed")

      toast.success(`Post ${action}ed successfully`)
      router.push("/editor")
    } catch (error) {
      toast.error("Failed to review post")
    } finally {
      setReviewLoading(false)
    }
  }

  const handleUploadDesigned = async () => {
    if (designFiles.length === 0) {
      toast.error("Please select design files")
      return
    }

    setUploadLoading(true)
    try {
      const formData = new FormData()
      designFiles.forEach((file) => formData.append("designs", file))

      const res = await fetch(`/api/posts/${id}/design`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      toast.success("Design files uploaded successfully")
      setDesignFiles([])
    } catch (error) {
      toast.error("Failed to upload design files")
    } finally {
      setUploadLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Post not found</p>
        <Button asChild>
          <Link href="/editor">Back to Dashboard</Link>
        </Button>
      </div>
    )
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
        <Badge className="h-fit capitalize">{post.status}</Badge>
      </div>

      {/* Author Info */}
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
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{post.submission_type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="font-medium">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Content Preview */}
      {post.raw_content && (
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {post.raw_content.slice(0, 500)}
                {post.raw_content.length > 500 ? "..." : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Designed Files */}
      {post.status === "ACCEPTED" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Designed Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-blue-100 transition-colors">
              <input
                type="file"
                onChange={(e) => setDesignFiles(Array.from(e.target.files || []))}
                accept=".jpg,.jpeg,.png,.pdf,.docx,.odt"
                multiple
                className="hidden"
                id="designs-input"
              />
              <label htmlFor="designs-input" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">
                  {designFiles.length > 0 ? `${designFiles.length} file(s) selected` : "Click to upload design files"}
                </p>
                <p className="text-xs text-muted-foreground">Images or Documents (max 20MB each, up to 20 files)</p>
              </label>
            </div>
            <Button
              onClick={handleUploadDesigned}
              disabled={uploadLoading || designFiles.length === 0}
              className="w-full"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Designed Files
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason Input */}
      {post.status === "PENDING_REVIEW" && (
        <Card>
          <CardHeader>
            <CardTitle>Rejection Reason (if applicable)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Explain why you're rejecting this submission..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {/* Review Actions */}
      {post.status === "PENDING_REVIEW" && (
        <div className="flex gap-4">
          <Button
            onClick={() => handleReview("accept")}
            disabled={reviewLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {reviewLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept & Move to Design
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
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Reject
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
