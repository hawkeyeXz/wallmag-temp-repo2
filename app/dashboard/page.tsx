"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push("/auth/login");
            return;
        }

        // Smart Redirection Logic
        switch (user.role) {
            case "admin":
                // Admins go to the Admin Dashboard
                router.push("/admin");
                break;
            case "editor":
                // Editors go to the Editor Dashboard
                router.push("/editor");
                break;
            case "publisher":
                // Publishers usually share the Admin or Editor view.
                // Adjust this based on your specific Publisher workflow.
                router.push("/admin");
                break;
        }
    }, [user, loading, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-500 font-medium">Redirecting to your dashboard...</p>
            </div>
        </div>
    );
}
