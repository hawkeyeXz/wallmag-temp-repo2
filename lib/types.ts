export type Category = "article" | "poem" | "art" | "news";

export interface Post {
    id: string;
    title: string;
    author: string;
    date: string; // ISO string
    category: Category;
    excerpt: string;
    content: string;
    image?: string; // for artwork/news thumbnails
    likes: number;
    approved: boolean;
}

export interface PostSummary extends Omit<Post, "category"> {
    category: Category;
    image?: string;
}
