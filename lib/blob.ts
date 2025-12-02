import { del, put } from "@vercel/blob";
export const FILE_TYPES = {
    DOCUMENTS: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ],
    IMAGES: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    DESIGNED: [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.oasis.opendocument.text",
    ],
};

export const MAX_FILE_SIZES = {
    ORIGINAL_DOCUMENT: 16 * 1024 * 1024, // 16MB
    ORIGINAL_IMAGE: 10 * 1024 * 1024, // 10MB
    DESIGNED_FILE: 20 * 1024 * 1024, // 20MB
};

// 1. Upload File (Replaces GridFS upload stream)
// Returns the Blob URL (string) instead of an ObjectId.
// You will need to update your DB Schema to accept strings for file_id,
// OR store the URL in a separate field.
export async function uploadFile(file: File, folder: string = "uploads"): Promise<string> {
    const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;

    const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
    });

    return blob.url;
}

// 2. Delete File (Replaces bucket.delete)
// We need the full URL to delete
export async function deleteFile(fileUrl: string) {
    if (!fileUrl) return;
    await del(fileUrl);
}

// 3. Validation Helper
export function validateFile(
    file: File,
    allowedMimeTypes: string[],
    maxSizeBytes: number
): { valid: boolean; error?: string } {
    if (file.size > maxSizeBytes) {
        const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxMB}MB`,
        };
    }

    if (!allowedMimeTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`,
        };
    }

    return { valid: true };
}

// Helper to parse FormData (Standard Next.js pattern)
export async function parseFileFromFormData(formData: FormData, fieldName: string): Promise<File | null> {
    const file = formData.get(fieldName);
    if (!file || !(file instanceof File)) {
        return null;
    }
    return file;
}
