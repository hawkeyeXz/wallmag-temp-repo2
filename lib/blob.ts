// lib/blob.ts
import { del, put } from "@vercel/blob";

export const FILE_TYPES = {
    DOCUMENTS: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ],
    IMAGES: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
};

export const MAX_FILE_SIZES = {
    ORIGINAL_DOCUMENT: 16 * 1024 * 1024,
    ORIGINAL_IMAGE: 10 * 1024 * 1024,
    DESIGNED_FILE: 20 * 1024 * 1024,
};

// FIX #5: Magic Number Verification
// Check the actual binary signature of the file
async function verifyMagicNumbers(file: File): Promise<boolean> {
    const arr = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    let header = "";
    for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).toUpperCase();
    }

    // PDF: %PDF (25 50 44 46)
    if (file.type === "application/pdf" && header.startsWith("25504446")) return true;

    // JPEG: FF D8 FF
    if ((file.type === "image/jpeg" || file.type === "image/jpg") && header.startsWith("FFD8FF")) return true;

    // PNG: 89 50 4E 47
    if (file.type === "image/png" && header.startsWith("89504E47")) return true;

    // ZIP/DOCX/ODT: PK (50 4B 03 04)
    if (file.type.includes("document") && header.startsWith("504B0304")) return true;

    // Text files are harder to verify by magic number, usually assume safe if other checks pass
    if (file.type === "text/plain") return true;

    return false;
}

export async function uploadFile(file: File, folder: string = "uploads"): Promise<string> {
    // Perform Verification
    const isAuthentic = await verifyMagicNumbers(file);
    if (!isAuthentic) {
        throw new Error("File content does not match extension (Spoofing detected)");
    }

    const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
    const blob = await put(filename, file, {
        access: "public",
        contentType: file.type,
    });
    return blob.url;
}

export async function deleteFile(fileUrl: string) {
    if (!fileUrl) return;
    await del(fileUrl);
}

export async function validateFile(
    file: File,
    allowedMimeTypes: string[],
    maxSizeBytes: number
): Promise<{ valid: boolean; error?: string }> {
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

    // Verify content strictly
    if (!(await verifyMagicNumbers(file))) {
        return { valid: false, error: "File corrupted or invalid format" };
    }

    return { valid: true };
}

export async function parseFileFromFormData(formData: FormData, fieldName: string): Promise<File | null> {
    const file = formData.get(fieldName);
    if (!file || !(file instanceof File)) {
        return null;
    }
    return file;
}
