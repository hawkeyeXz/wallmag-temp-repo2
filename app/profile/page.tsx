"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

async function fetcher(url: string) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
}

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}

function ProfileContent() {
    const { user } = useAuth();
    const { data, isLoading, mutate } = useSWR("/api/user/profile", fetcher);

    const profile = data?.user;
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: profile?.name || "",
        bio: profile?.bio || "",
        avatar_url: profile?.avatar_url || "",
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Update failed");

            toast.success("Profile updated successfully");
            setEditing(false);
            mutate();
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-muted-foreground">Manage your account information</p>
            </div>

            {/* Profile Card */}
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>Profile Information</CardTitle>
                    {!editing && (
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                            Edit
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {editing ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bio</label>
                                <Textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={4}
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={loading} className="flex-1">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                                <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{profile?.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{profile?.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">ID Number</p>
                                <p className="font-medium">{profile?.id_number}</p>
                            </div>
                            {profile?.bio && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Bio</p>
                                    <p className="font-medium">{profile?.bio}</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Posts Submitted", value: profile?.posts_count || 0 },
                            { label: "Posts Published", value: profile?.published_count || 0 },
                            { label: "Total Views", value: profile?.total_views || 0 },
                            { label: "Total Likes", value: profile?.total_likes || 0 },
                        ].map(stat => (
                            <div key={stat.label} className="p-3 bg-muted rounded-lg text-center">
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Account Security */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Two-factor authentication is{" "}
                            {profile?.two_factor_enabled ? (
                                <span className="font-medium text-green-600">enabled</span>
                            ) : (
                                <span className="font-medium text-orange-600">disabled</span>
                            )}
                        </AlertDescription>
                    </Alert>
                    <Button asChild variant="outline" className="w-full bg-transparent">
                        <a href="/settings/security">Manage Security</a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
