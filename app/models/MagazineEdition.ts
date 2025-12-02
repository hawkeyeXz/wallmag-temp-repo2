import mongoose, { Document, Schema, models } from "mongoose";

export interface IMagazineEdition extends Document {
    title: string;
    pdf_url: string;
    cover_image_url?: string; // Optional cover image for the archive page
    published_at: Date;
    published_by: mongoose.Types.ObjectId;
    is_current: boolean; // Only one edition should be current at a time
    description?: string;
    academic_year?: string; // e.g., "2024-2025"
}

const MagazineEditionSchema = new Schema<IMagazineEdition>(
    {
        title: { type: String, required: true, trim: true },
        pdf_url: { type: String, required: true },
        cover_image_url: { type: String },
        published_at: { type: Date, default: Date.now },
        published_by: { type: Schema.Types.ObjectId, ref: "Profiles", required: true },
        is_current: { type: Boolean, default: false },
        description: { type: String },
        academic_year: { type: String },
    },
    {
        timestamps: true,
    }
);

// Ensure we can quickly find the current edition
MagazineEditionSchema.index({ is_current: 1 });
MagazineEditionSchema.index({ published_at: -1 });

const MagazineEdition =
    models.MagazineEdition || mongoose.model<IMagazineEdition>("MagazineEdition", MagazineEditionSchema);

export default MagazineEdition;
