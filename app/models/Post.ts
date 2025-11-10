// app/models/Post.ts
import mongoose, { Document, Schema, models } from "mongoose";

export interface IPost extends Document {
    // Basic Info
    title: string;
    category: "article" | "poem" | "artwork" | "notice";
    tags: string[];
    author: mongoose.Types.ObjectId; // References Profiles
    author_name: string; // Denormalized for quick access
    author_email: string; // For notifications

    // Submission Stage
    submission_type: "upload" | "paste" | "image_upload";

    // Original File (if uploaded - .docx, .pdf, .txt)
    original_file?: {
        file_id: mongoose.Types.ObjectId; // GridFS reference
        filename: string;
        mimetype: string; // application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
        size: number;
        uploaded_at: Date;
    };

    // Raw Content (if pasted)
    raw_content?: string;

    // Original Image Upload (if category is artwork and user uploads image directly)
    original_images?: Array<{
        file_id: mongoose.Types.ObjectId; // GridFS reference
        filename: string;
        mimetype: string; // image/jpeg, image/png, image/jpg
        size: number;
        uploaded_at: Date;
    }>;

    // Editorial Workflow
    status:
        | "PENDING_REVIEW" // Student submitted, waiting for editor
        | "ACCEPTED" // Editor accepted, ready for design
        | "REJECTED" // Editor rejected
        | "DESIGNING" // Editor is designing
        | "AWAITING_ADMIN" // Design uploaded, admin needs to review
        | "ADMIN_REJECTED" // Admin rejected design (back to editor)
        | "APPROVED" // Admin approved
        | "PUBLISHED"; // Live on website

    // Review Info
    reviewed_by?: mongoose.Types.ObjectId; // Editor who reviewed
    reviewed_at?: Date;
    rejection_reason?: string;

    // Designed Files (uploaded by editor as images after designing)
    designed_files: Array<{
        file_id: mongoose.Types.ObjectId; // GridFS - images only (.jpg, .png)
        filename: string;
        mimetype: string; // image/jpeg, image/png
        size: number;
        uploaded_by: mongoose.Types.ObjectId;
        uploaded_at: Date;
        version: number; // In case editor re-uploads
        is_current: boolean; // Only one version is active
    }>;

    // Publishing
    published_at?: Date;
    published_by?: mongoose.Types.ObjectId; // Admin or Publisher
    featured_until?: Date; // For featured posts
    excerpt?: string; // Auto-generated or manual summary

    // Engagement (only after published)
    likes: mongoose.Types.ObjectId[]; // User IDs who liked
    views: number;
    comments_count: number; // Will implement comments later

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
            required: true,
        },
        tags: [{ type: String, trim: true, lowercase: true }],
        author: { type: Schema.Types.ObjectId, ref: "Profiles", required: true },
        author_name: { type: String, required: true, trim: true },
        author_email: { type: String, required: true, trim: true },

        // Submission
        submission_type: {
            type: String,
            enum: ["upload", "paste", "image_upload"],
            required: true,
        },

        // Original Document Upload (.docx, .pdf, .txt)
        original_file: {
            file_id: { type: Schema.Types.ObjectId },
            filename: { type: String },
            mimetype: {
                type: String,
                enum: [
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                    "text/plain",
                ],
            },
            size: { type: Number },
            uploaded_at: { type: Date },
        },

        // Pasted Text
        raw_content: { type: String, maxlength: 50000 }, // 50KB limit for pasted text

        // Original Image Upload (for artwork category)
        original_images: [
            {
                file_id: { type: Schema.Types.ObjectId, required: true },
                filename: { type: String, required: true },
                mimetype: {
                    type: String,
                    enum: ["image/jpeg", "image/png", "image/jpg"],
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

        // Designed Files (by editor - images OR documents)
        designed_files: [
            {
                file_id: { type: Schema.Types.ObjectId, required: true },
                filename: { type: String, required: true },
                mimetype: {
                    type: String,
                    enum: [
                        // Images
                        "image/jpeg",
                        "image/png",
                        "image/jpg",
                        // Documents
                        "application/pdf",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
                        "application/vnd.oasis.opendocument.text", // .odt
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

// Indexes for performance
PostSchema.index({ status: 1, created_at: -1 }); // Editor/admin queues
PostSchema.index({ author: 1, created_at: -1 }); // User's posts
PostSchema.index({ status: 1, category: 1 }); // Public filtering
PostSchema.index({ published_at: -1 }, { sparse: true }); // Latest published
PostSchema.index({ tags: 1 }); // Tag search

// Auto-generate excerpt if not provided
PostSchema.pre("save", function (next) {
    if (!this.excerpt && this.raw_content) {
        this.excerpt = this.raw_content.slice(0, 200).trim() + (this.raw_content.length > 200 ? "..." : "");
    }
    next();
});

const Post = models.Post || mongoose.model<IPost>("Post", PostSchema);
export default Post;
