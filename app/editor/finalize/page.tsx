"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProtectedRoute } from "@/contexts/AuthContext";
import { FileIcon, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function FinalizePage() {
    return (
        <ProtectedRoute allowedRoles={["editor", "admin"]}>
            <FinalizeForm />
        </ProtectedRoute>
    );
}

function FinalizeForm() {
    const [file, setFile] = useState<File | null>(null);
    const [editionTitle, setEditionTitle] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !editionTitle) {
            toast.error("Please provide a title and select a file");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", editionTitle);

            // You'll need to create this API route
            const res = await fetch("/api/admin/magazine/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            toast.success("Magazine edition uploaded successfully!");
            setFile(null);
            setEditionTitle("");
        } catch (error) {
            toast.error("Failed to upload magazine");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Publish Magazine Edition</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Upload Final PDF</CardTitle>
                    <CardDescription>
                        Upload the compiled PDF version of the Wall Magazine. This will replace the current live
                        edition.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Edition Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Spring Edition 2025"
                                value={editionTitle}
                                onChange={e => setEditionTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Magazine PDF File</Label>
                            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 transition-colors">
                                <input
                                    type="file"
                                    id="mag-file"
                                    className="hidden"
                                    accept="application/pdf"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    required
                                />
                                <label htmlFor="mag-file" className="cursor-pointer block">
                                    <div className="flex flex-col items-center gap-2">
                                        {file ? (
                                            <>
                                                <FileIcon className="w-10 h-10 text-blue-600" />
                                                <p className="font-medium text-slate-900">{file.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-10 h-10 text-slate-400" />
                                                <p className="font-medium text-slate-600">Click to select PDF</p>
                                                <p className="text-xs text-slate-400">PDF only, max 50MB</p>
                                            </>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading || !file}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading & Publishing...
                                </>
                            ) : (
                                "Publish Edition"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
