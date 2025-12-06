import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import type React from "react";
import { Suspense } from "react";
import "./globals.css";

const sans = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

const mono = Roboto_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: "Apodartho: eWall Magazine of Physics, College Surendranath College",
    description:
        "Apodartho is the yearly e-wall magazine from the Department of Physics, College Srendranath College — showcasing articles, poems, artwork, and news.",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "light",
};

function PageLoading() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full" />
            </div>
        </div>
    );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <html lang="en" className={`${sans.variable} ${mono.variable}`}>
                <body className="font-sans">
                    <Suspense fallback={<PageLoading />}>
                        <SiteHeader />
                        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
                    </Suspense>
                    <Toaster position="bottom-right" />
                </body>
            </html>
        </AuthProvider>
    );
}
