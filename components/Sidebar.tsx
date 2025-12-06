"use client";

import { FileText, LayoutDashboard, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_ITEMS = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Edit Profile", href: "/dashboard/profile", icon: User },
    { name: "Security", href: "/dashboard/security", icon: Shield },
    { name: "My Submissions", href: "/dashboard/submissions", icon: FileText },
];

export default function Sidebar({ user }: { user: any }) {
    const pathname = usePathname();

    return (
        <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                {/* User Info Block */}
                <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
                    <div className="relative inline-block">
                        <img
                            className="h-24 w-24 rounded-full ring-4 ring-white shadow-md mx-auto object-cover"
                            src={user.avatar}
                            alt={user.name}
                        />
                        <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-white"></span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-slate-900">{user.name}</h2>
                    <p className="text-sm text-slate-500 font-medium">{user.role}</p>
                </div>

                {/* Navigation Links */}
                <nav className="p-4 space-y-1">
                    {MENU_ITEMS.map(item => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 font-medium"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Icon size={20} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-2 border-t border-slate-100">
                    <button className="w-full flex items-center space-x-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
