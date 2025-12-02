import mongoose, { Document, Schema, models } from "mongoose";

export interface IPost extends Document {
    // Basic Info
    title: string;
    category?: "article" | "poem" | "artwork" | "notice";

    author: mongoose.Types.ObjectId; // References Profiles
    author_name: string;
    author_email: string;

    // Submission Stage
    submission_type: "upload" | "paste" | "image_upload";

    // Original File (DOCX/PDF/TXT/Images) - Stored in Vercel Blob
    original_file?: {
        url: string;
        filename: string;
        mimetype: string;
        size: number;
        uploaded_at: Date;
    };

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

    // Publishing
    published_at?: Date;
    published_by?: mongoose.Types.ObjectId;
    featured_until?: Date;
    excerpt?: string;

    // Metadata
    created_at: Date;
}

const PostSchema = new Schema<IPost>(
    {
        // Basic Info
        title: { type: String, required: true, trim: true, maxlength: 200 }, // Global unique removed
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

        // Original Document Upload (Now handles pasted text as .txt files too)
        original_file: {
            url: { type: String },
            filename: { type: String },
            mimetype: { type: String },
            size: { type: Number },
            uploaded_at: { type: Date },
        },

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

        // Publishing
        published_at: { type: Date },
        published_by: { type: Schema.Types.ObjectId, ref: "Profiles" },
        featured_until: { type: Date },
        excerpt: { type: String, maxlength: 300 },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false }, // UpdatedAt disabled
    }
);

// Indexes
PostSchema.index({ status: 1, created_at: -1 });
PostSchema.index({ author: 1, created_at: -1 });
PostSchema.index({ status: 1, category: 1 });
PostSchema.index({ published_at: -1 }, { sparse: true });

// COMPOUND INDEX: Ensures a single author cannot reuse the same title, but others can.
PostSchema.index({ author: 1, title: 1 }, { unique: true });

const Post = models.Post || mongoose.model<IPost>("Post", PostSchema);
export default Post;
