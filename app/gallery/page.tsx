"use client"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"

async function fetcher(url: string) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

interface PostData {
  _id: string
  title: string
  author: { name: string }
  original_images?: Array<{ file_id: string; filename: string }>
  designed_files?: Array<{ file_id: string }>
  created_at: string
  views: number
  likes: string[]
}

export default function GalleryPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSWR(`/api/posts?status=PUBLISHED&category=artwork&page=${page}&limit=20`, fetcher)

  const posts = data?.posts || []

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Art Gallery</h1>
        <p className="text-muted-foreground">Stunning artwork and photography from our community</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post: PostData) => {
            const imageUrl = post.designed_files?.[0]?.file_id || post.original_images?.[0]?.file_id
            return (
              <Link
                key={post._id}
                href={`/post/${post._id}`}
                className="group relative rounded-lg overflow-hidden bg-muted h-64 flex items-center justify-center border"
              >
                {imageUrl ? (
                  <>
                    <img
                      src={`/api/posts/files/${imageUrl}`}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </>
                ) : (
                  <span className="text-muted-foreground">No image</span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium line-clamp-2">{post.title}</p>
                  <p className="text-white/80 text-xs">by {post.author.name}</p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No artwork published yet</p>
        </div>
      )}
    </div>
  )
}
