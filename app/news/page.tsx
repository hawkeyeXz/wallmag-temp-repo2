"use client"

import { PostCard } from "@/components/post-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import useSWR from "swr"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to fetch")
  }
  return res.json()
}

interface PostData {
  _id: string
  title: string
  category: string
  author: { name: string }
  excerpt?: string
  raw_content?: string
  created_at: string
  likes: string[]
}

export default function NewsPage() {
  const { data, isLoading, error } = useSWR(`/api/posts?status=PUBLISHED&category=notice&limit=20`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const posts = data?.posts || []

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">News & Updates</h1>
        <p className="text-muted-foreground">Latest news and announcements</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load news. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : posts.length > 0 ? (
        <div className="grid gap-4">
          {posts.map((post: PostData) => (
            <PostCard
              key={post._id}
              post={{
                id: post._id,
                title: post.title,
                author: post.author.name,
                date: post.created_at,
                category: post.category as any,
                excerpt: post.excerpt || post.raw_content?.slice(0, 150) || "",
                content: post.raw_content || "",
                likes: post.likes.length,
                approved: true,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No news published yet</p>
        </div>
      )}
    </div>
  )
}
