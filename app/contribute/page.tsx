"use client";

import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";
import { AlertCircle, FileText, ImageIcon, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ContributePage() {
    return (
        <ProtectedRoute>
            <ContributeForm />
        </ProtectedRoute>
    );
}

function ContributeForm() {
    const { user } = useAuth();
    const [submissionType, setSubmissionType] = useState<"paste" | "upload" | "image_upload">("paste");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",

        raw_content: "",
    });
    const [file, setFile] = useState<File | null>(null);
    const [images, setImages] = useState<File[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append("title", formData.title);

            data.append("submission_type", submissionType);

            if (submissionType === "paste") {
                if (!formData.raw_content.trim()) {
                    throw new Error("Please enter content");
                }
                data.append("raw_content", formData.raw_content);
            } else if (submissionType === "upload") {
                if (!file) throw new Error("Please select a file");
                data.append("file", file);
            } else if (submissionType === "image_upload") {
                if (images.length === 0) throw new Error("Please select at least one image");
                images.forEach(img => data.append("images", img));
            }

            const res = await fetch("/api/posts", {
                method: "POST",
                credentials: "include",
                body: data,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Submission failed");
            }

            toast.success("Post submitted successfully! Awaiting editor review.");
            setFormData({
                title: "",

                raw_content: "",
            });
            setFile(null);
            setImages([]);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Submission failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Contribute to Apodartho</h1>
                <p className="text-muted-foreground">Share your work with our community</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                        placeholder="Enter post title"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        maxLength={200}
                        required
                    />
                    <p className="text-xs text-muted-foreground">{formData.title.length}/200</p>
                </div>

                {/* Submission Type */}
                <div className="space-y-4">
                    <label className="text-sm font-medium">How would you like to submit? *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: "paste", label: "Paste Text", icon: FileText },
                            { value: "upload", label: "Upload File", icon: Upload },
                            { value: "image_upload", label: "Upload Images", icon: ImageIcon },
                        ].map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setSubmissionType(value as any)}
                                className={`p-4 border rounded-lg text-center transition-colors ${
                                    submissionType === value
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted hover:bg-muted/50"
                                }`}
                            >
                                <Icon className="w-6 h-6 mx-auto mb-2" />
                                <span className="text-sm font-medium">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Input */}
                {submissionType === "paste" && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Content *</label>
                        <Textarea
                            placeholder="Paste your content here..."
                            value={formData.raw_content}
                            onChange={e => setFormData({ ...formData, raw_content: e.target.value })}
                            rows={8}
                            maxLength={50000}
                            required
                        />
                        <p className="text-xs text-muted-foreground">{formData.raw_content.length}/50,000 characters</p>
                    </div>
                )}

                {/* File Upload */}
                {submissionType === "upload" && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Upload Document *</label>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                accept=".pdf,.docx,.txt"
                                required
                                className="hidden"
                                id="file-input"
                            />
                            <label htmlFor="file-input" className="cursor-pointer">
                                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    {file ? file.name : "Click to upload or drag and drop"}
                                </p>
                                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT (max 16MB)</p>
                            </label>
                        </div>
                    </div>
                )}

                {/* Image Upload */}
                {submissionType === "image_upload" && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Upload Images *</label>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                                type="file"
                                onChange={e => setImages(Array.from(e.target.files || []))}
                                accept=".jpg,.jpeg,.png"
                                multiple
                                required
                                className="hidden"
                                id="images-input"
                            />
                            <label htmlFor="images-input" className="cursor-pointer">
                                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    {images.length > 0
                                        ? `${images.length} image(s) selected`
                                        : "Click to upload or drag and drop"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    JPG, PNG (max 10MB each, up to 10 images)
                                </p>
                            </label>
                        </div>
                    </div>
                )}

                {/* Alert */}
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Your submission will be reviewed by editors before publishing. This typically takes 2-3 business
                        days.
                    </AlertDescription>
                </Alert>

                {/* Submit Button */}
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Submit Post"
                    )}
                </Button>
            </form>
        </div>
    );
}
