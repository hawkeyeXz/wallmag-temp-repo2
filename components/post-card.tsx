"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Post } from "@/lib/types";
import Link from "next/link";
import { toast } from "sonner";
import useSWRMutation from "swr/mutation";

async function likeFetcher(url: string, { arg }: { arg: { id: string } }) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
    });
    if (!res.ok) throw new Error("Failed to like");
    return res.json();
}

export function PostCard({ post, onLiked }: { post: Post; onLiked?: (id: string) => void }) {
    const { trigger, isMutating } = useSWRMutation("/api/like", likeFetcher);

    const onLike = async () => {
        try {
            await trigger({ id: post.id });
            onLiked?.(post.id);
            toast.success("Thanks!You liked this post.");
        } catch {
            toast.error("Error! Unable to like post.");
        }
    };

    const onShare = async () => {
        const url = typeof window !== "undefined" ? window.location.origin + "/post/" + post.id : "";
        if ((navigator as any).share) {
            try {
                await (navigator as any).share({ title: post.title, text: post.excerpt, url });
            } catch {}
        } else {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied Post URL copied to clipboard.");
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">
                        {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(post.date).toLocaleDateString()}</span>
                </div>
                <CardTitle className="text-pretty leading-tight">
                    <Link href={`/post/${post.id}`} className="hover:underline">
                        {post.title}
                    </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">By {post.author}</p>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
                {post.image ? (
                    <Link href={`/post/${post.id}`}>
                        <img
                            src={post.image || "/placeholder.svg"}
                            alt={post.title}
                            className="w-full h-40 object-cover rounded-md border"
                        />
                    </Link>
                ) : null}
                <p className="text-sm text-pretty">{post.excerpt}</p>
                <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="secondary" onClick={onLike} disabled={isMutating} aria-label="Like">
                        ❤️ <span className="ml-2 text-xs">{post.likes}</span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onShare} aria-label="Share">
                        Share
                    </Button>
                    <Button size="sm" asChild>
                        <Link href={`/post/${post.id}#comments`}>Comment</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
