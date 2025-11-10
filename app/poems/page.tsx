"use client"

import { PostCard } from "@/components/post-card"
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
import { useState } from "react"
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

export default function PoemsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useSWR(
    `/api/posts?status=PUBLISHED&category=poem&page=${page}&limit=12`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )

  const posts = data?.posts || []
  const pagination = data?.pagination

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Poetry Collection</h1>
        <p className="text-muted-foreground">Beautiful verses from our community</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load poems. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <p className="text-muted-foreground">No poems published yet</p>
        </div>
      )}
    </div>
  )
}
