"use client"

import type React from "react"

import { PostCard } from "@/components/post-card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, X } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import useSWR from "swr"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
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

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState("all")
  const [submitted, setSubmitted] = useState(!!initialQuery)

  const { data, isLoading } = useSWR(
    submitted ? `/api/posts?search=${encodeURIComponent(query)}&category=${category !== "all" ? category : ""}` : null,
    fetcher,
  )

  const posts = data?.posts || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setSubmitted(true)
    }
  }

  const handleClear = () => {
    setQuery("")
    setSubmitted(false)
    setCategory("all")
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Search Posts</h1>
        <p className="text-muted-foreground">Find articles, poems, artwork, and more</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, tags, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {submitted && (
            <Button type="button" variant="outline" size="icon" onClick={handleClear}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button type="submit">Search</Button>
        </div>

        {/* Category Filter */}
        <Tabs value={category} onValueChange={setCategory} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="article">Articles</TabsTrigger>
            <TabsTrigger value="poem">Poems</TabsTrigger>
            <TabsTrigger value="artwork">Art</TabsTrigger>
          </TabsList>
        </Tabs>
      </form>

      {/* Results */}
      {submitted ? (
        <>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-lg" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Found {posts.length} result{posts.length !== 1 ? "s" : ""}
              </p>
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
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No posts found matching your search</p>
              <Button onClick={handleClear} variant="outline">
                Clear search
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">Start searching to find posts</p>
        </div>
      )}
    </div>
  )
}
