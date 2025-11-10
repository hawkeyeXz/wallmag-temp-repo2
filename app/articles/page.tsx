"use client"

import { PostCard } from "@/components/post-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useState, useCallback } from "react"
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
  author: { name: string; id_number: string }
  excerpt?: string
  raw_content?: string
  created_at: string
  likes: string[]
  views: number
}

export default function ArticlesPage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState("latest")

  const { data, isLoading, error } = useSWR(
    `/api/posts?status=PUBLISHED&category=article&page=${page}&limit=12`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )

  const posts = data?.posts || []
  const pagination = data?.pagination

  const sortedPosts = useCallback(() => {
    return [...posts].sort((a, b) => {
      if (sortBy === "most-viewed") {
        return (b.views || 0) - (a.views || 0)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [posts, sortBy])()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Articles</h1>
            <p className="text-muted-foreground mt-1">Explore insightful articles from our community</p>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="most-viewed">Most Viewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load articles. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedPosts.map((post: PostData) => (
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

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} href="#" />
                  </PaginationItem>
                )}
                {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink href="#" isActive={page === pageNum} onClick={() => setPage(pageNum)}>
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}
                {page < pagination.pages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} href="#" />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No articles published yet</p>
        </div>
      )}
    </div>
  )
}
