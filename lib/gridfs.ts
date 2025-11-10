import { error } from "console";
import mongoose from "mongoose";
import { Readable } from "stream";

let gridfsBucket: mongoose.mongo.GridFSBucket;

export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
    if (!gridfsBucket) {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("MongoDB connection is not connected");
        }
        gridfsBucket = new mongoose.mongo.GridFSBucket(db, {
            bucketName: "uploads",
        });
    }
    return gridfsBucket;
}

export async function uploadFile(buffer: Buffer, filename: string, mimetype: string): Promise<mongoose.Types.ObjectId> {
    const bucket = getGridFSBucket();

    const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype,
        metadata: {
            uploadAt: new Date(),
            originalName: filename,
            size: buffer.length,
        },
    });
    return new Promise((resolve, reject) => {
        const readSteam = Readable.from(buffer);
        readSteam.pipe(uploadStream);

        uploadStream.on("error", err => {
            reject(err);
        });
    });
}

export function downloadFile(fieldId: mongoose.Types.ObjectId): Promise<Buffer> {
    const bucket = getGridFSBucket();

    const downloadStream = bucket.openDownloadStream(fieldId);

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        downloadStream.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });
        downloadStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        downloadStream.on("error", err => {
            reject(err);
        });
    });
}

export async function getFileInfo(fileId: mongoose.Types.ObjectId) {
    const bucket = getGridFSBucket();
    const files = await bucket.find({ _id: fileId }).toArray();

    if (files.length === 0) {
        throw new Error("File not found in database");
    }
    return files[0];
}

export async function deleteFile(fileId: mongoose.Types.ObjectId) {
    const bucket = getGridFSBucket();
    await bucket.delete(fileId);
}

export function streamFileToResponse(fileId: mongoose.Types.ObjectId) {
    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(fileId);

    return new ReadableStream({
        start(controller) {
            downloadStream.on("data", (chunk: Buffer) => {
                controller.enqueue(chunk);
            });
            downloadStream.on("end", () => {
                controller.close();
            });

            downloadStream.on("error", () => {
                controller.error(error);
            });
        },
    });
}

export function validateFile(
    file: { size: number; type: string } | Buffer,
    allowedMimeTypes: string[],
    maxSizeBytes: number
): { valid: boolean; error?: string } {
    let size: number;
    let type: string;

    if (Buffer.isBuffer(file)) {
        size = file.length;
        type = "";
    } else {
        size = file.size;
        type = file.type;
    }

    if (size > maxSizeBytes) {
        const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxMB}MB`,
        };
    }

    if (type && !allowedMimeTypes.includes(type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`,
        };
    }

    return { valid: true };
}

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

export async function parseFileFromData(
    formData: FormData,
    fieldName: string
): Promise<{ buffer: Buffer; filename: string; mimetype: string } | null> {
    const file = formData.get(fieldName);

    if (!file || !(file instanceof File)) {
        return null;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return {
        buffer,
        filename: file.name,
        mimetype: file.type,
    };
}

export async function parseMultipleFilesFromFormData(
    formData: FormData,
    fieldName: string
): Promise<Array<{ buffer: Buffer; filename: string; mimetype: string }>> {
    const files = formData.getAll(fieldName);
    const results = [];

    for (const file of files) {
        if (file instanceof File) {
            const buffer = Buffer.from(await file.arrayBuffer());
            results.push({
                buffer,
                filename: file.name,
                mimetype: file.type,
            });
        }
    }
    return results;
}
