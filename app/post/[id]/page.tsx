"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Share2, Heart } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function PostPage() {
  const params = useParams()
  const id = params.id as string

  const { data: postData, isLoading, mutate } = useSWR(`/api/posts/${id}`, fetcher)

  const post = postData?.post

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${id}/like`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to like")
      mutate()
      toast.success("Post liked!")
    } catch (error) {
      toast.error("Failed to like post")
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url,
        })
      } catch (e) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-96 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Post not found</p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <article className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {post.category}
          </Badge>
          <span className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{post.author?.name || "Anonymous"}</p>
            <p className="text-sm text-muted-foreground">{post.views || 0} views</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLike}>
              <Heart className="w-4 h-4 mr-2" />
              {post.likes?.length || 0}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {post.designed_files && post.designed_files.length > 0 && (
        <div className="rounded-lg overflow-hidden border bg-muted h-96">
          <img
            src={`/api/posts/files/${post.designed_files[0].file_id}`}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {post.raw_content && (
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">{post.raw_content}</div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t pt-8 flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/">← Back</Link>
        </Button>
        <Button variant="outline" onClick={handleShare}>
          Share
        </Button>
      </div>
    </article>
  )
}
