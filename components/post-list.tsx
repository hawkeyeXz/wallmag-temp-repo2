"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category, Post } from "@/lib/types"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { PostCard } from "./post-card"
import { Skeleton } from "@/components/ui/skeleton"

type ApiResponse = {
  items: Post[]
  total: number
  page: number
  pageSize: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function PostList({
  initialCategory,
  showCategoryFilter = false,
}: {
  initialCategory?: Category
  showCategoryFilter?: boolean
}) {
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<Category | "all">(initialCategory ?? "all")
  const [page, setPage] = useState(1)

  const url = useMemo(() => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (category !== "all") sp.set("category", category)
    sp.set("page", String(page))
    sp.set("limit", "6")
    return `/api/posts?${sp.toString()}`
  }, [q, category, page])

  const { data, isLoading, mutate, error } = useSWR<ApiResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const onLiked = () => {
    mutate()
  }

  const maxPages = data ? Math.ceil(data.total / data.pageSize) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Input
          placeholder="Search by title, author, or excerpt"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          aria-label="Search posts"
        />
        {showCategoryFilter ? (
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as any)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="article">Articles</SelectItem>
              <SelectItem value="poem">Poems</SelectItem>
              <SelectItem value="notice">News</SelectItem>
              <SelectItem value="artwork">Artwork</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Failed to load posts. Please try again.</div>
      ) : data && data.items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((p) => (
            <PostCard key={p.id} post={p} onLiked={onLiked} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No posts found.</div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          Page {data?.page ?? 1} of {maxPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!data || data.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button size="sm" disabled={!data || data.page >= maxPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
