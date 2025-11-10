"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Post } from "@/lib/types";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function GalleryGrid() {
    const { data } = useSWR<{ items: Post[] }>("/api/posts?category=art&limit=30", fetcher);
    const [active, setActive] = useState<Post | null>(null);

    return (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {data?.items?.map(p => (
                <button
                    key={p.id}
                    onClick={() => setActive(p)}
                    className="group relative overflow-hidden rounded-md border"
                    aria-label={`Open artwork ${p.title} by ${p.author}`}
                >
                    <img
                        src={p.image || "/placeholder.svg?height=400&width=600&query=student%20artwork"}
                        alt={p.title}
                        className="h-48 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left">
                        <p className="text-xs text-white/90">{p.title}</p>
                        <p className="text-[10px] text-white/70">by {p.author}</p>
                    </div>
                </button>
            ))}

            <Dialog open={!!active} onOpenChange={() => setActive(null)}>
                <DialogContent className="max-w-4xl">
                    {active ? (
                        <figure className="space-y-3">
                            <img
                                src={
                                    active.image ||
                                    "/placeholder.svg?height=800&width=1200&query=student%20artwork%20detail"
                                }
                                alt={active.title}
                                className="w-full h-auto rounded-md border"
                            />
                            <figcaption className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{active.title}</span> by {active.author}
                            </figcaption>
                        </figure>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
