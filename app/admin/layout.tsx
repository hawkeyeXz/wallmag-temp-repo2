"use client";

import { ProtectedRoute } from "@/contexts/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>;
}
