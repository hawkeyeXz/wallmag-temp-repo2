import mongoose, { Document, Schema, models } from "mongoose";

export interface IPost extends Document {
    // Basic Info
    title: string;
    category?: "article" | "poem" | "artwork" | "notice";

    author: mongoose.Types.ObjectId; // References Profiles
    author_name: string; // Denormalized for quick access
    author_email: string; // For notifications

    // Submission Stage
    submission_type: "upload" | "paste" | "image_upload";

    // Original File (DOCX/PDF) - Stored in Vercel Blob
    original_file?: {
        url: string; // Blob URL
        filename: string;
        mimetype: string;
        size: number;
        uploaded_at: Date;
    };

    // Raw Content (if pasted)
    raw_content?: string;

    // Original Images (Artwork) - Stored in Vercel Blob
    original_images?: Array<{
        url: string; // Blob URL
        filename: string;
        mimetype: string;
        size: number;
        uploaded_at: Date;
    }>;

    // Editorial Workflow
    status:
        | "PENDING_REVIEW"
        | "ACCEPTED"
        | "REJECTED"
        | "DESIGNING"
        | "AWAITING_ADMIN"
        | "ADMIN_REJECTED"
        | "APPROVED"
        | "PUBLISHED";

    // Review Info
    reviewed_by?: mongoose.Types.ObjectId;
    reviewed_at?: Date;
    rejection_reason?: string;

    // Designed Files (Final Versions) - Stored in Vercel Blob
    designed_files: Array<{
        url: string; // Blob URL
        filename: string;
        mimetype: string;
        size: number;
        uploaded_by: mongoose.Types.ObjectId;
        uploaded_at: Date;
        version: number;
        is_current: boolean;
    }>;

    // Publishing
    published_at?: Date;
    published_by?: mongoose.Types.ObjectId;
    featured_until?: Date;
    excerpt?: string;

    // Engagement
    likes: mongoose.Types.ObjectId[];
    views: number;
    comments_count: number;

    // Metadata
    created_at: Date;
    updated_at: Date;
}

const PostSchema = new Schema<IPost>(
    {
        // Basic Info
        title: { type: String, required: true, trim: true, maxlength: 200 },
        category: {
            type: String,
            enum: ["article", "poem", "artwork", "notice"],
            required: false,
        },

        author: { type: Schema.Types.ObjectId, ref: "Profiles", required: true },
        author_name: { type: String, required: true, trim: true },
        author_email: { type: String, required: true, trim: true },

        // Submission
        submission_type: {
            type: String,
            enum: ["upload", "paste", "image_upload"],
            required: true,
        },

        // Original Document Upload
        original_file: {
            url: { type: String }, // Changed from file_id to url
            filename: { type: String },
            mimetype: {
                type: String,
                enum: [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "text/plain",
                ],
            },
            size: { type: Number },
            uploaded_at: { type: Date },
        },

        // Pasted Text
        raw_content: { type: String, maxlength: 50000 },

        // Original Image Upload
        original_images: [
            {
                url: { type: String, required: true }, // Changed from file_id to url
                filename: { type: String, required: true },
                mimetype: {
                    type: String,
                    enum: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
                    required: true,
                },
                size: { type: Number, required: true },
                uploaded_at: { type: Date, default: Date.now },
            },
        ],

        // Workflow
        status: {
            type: String,
            enum: [
                "PENDING_REVIEW",
                "ACCEPTED",
                "REJECTED",
                "DESIGNING",
                "AWAITING_ADMIN",
                "ADMIN_REJECTED",
                "APPROVED",
                "PUBLISHED",
            ],
            default: "PENDING_REVIEW",
            required: true,
        },
        reviewed_by: { type: Schema.Types.ObjectId, ref: "Profiles" },
        reviewed_at: { type: Date },
        rejection_reason: { type: String, maxlength: 1000 },

        // Designed Files
        designed_files: [
            {
                url: { type: String, required: true }, // Changed from file_id to url
                filename: { type: String, required: true },
                mimetype: {
                    type: String,
                    enum: [
                        "image/jpeg",
                        "image/png",
                        "image/jpg",
                        "image/webp",
                        "application/pdf",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.oasis.opendocument.text",
                    ],
                    required: true,
                },
                size: { type: Number, required: true },
                uploaded_by: { type: Schema.Types.ObjectId, ref: "Profiles", required: true },
                uploaded_at: { type: Date, default: Date.now },
                version: { type: Number, required: true },
                is_current: { type: Boolean, default: true },
            },
        ],

        // Publishing
        published_at: { type: Date },
        published_by: { type: Schema.Types.ObjectId, ref: "Profiles" },
        featured_until: { type: Date },
        excerpt: { type: String, maxlength: 300 },

        // Engagement
        likes: [{ type: Schema.Types.ObjectId, ref: "Profiles" }],
        views: { type: Number, default: 0 },
        comments_count: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

// Indexes
PostSchema.index({ status: 1, created_at: -1 });
PostSchema.index({ author: 1, created_at: -1 });
PostSchema.index({ status: 1, category: 1 });
PostSchema.index({ published_at: -1 }, { sparse: true });

// Auto-generate excerpt
PostSchema.pre("save", function (next) {
    if (!this.excerpt && this.raw_content) {
        this.excerpt = this.raw_content.slice(0, 200).trim() + (this.raw_content.length > 200 ? "..." : "");
    }
    next();
});

const Post = models.Post || mongoose.model<IPost>("Post", PostSchema);
export default Post;
