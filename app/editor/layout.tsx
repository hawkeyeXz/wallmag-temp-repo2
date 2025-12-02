"use client";

import { ProtectedRoute } from "@/contexts/AuthContext";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
    // Editors, Admins, and Publishers can access the editor dashboard
    return <ProtectedRoute allowedRoles={["editor", "admin", "publisher"]}>{children}</ProtectedRoute>;
}
