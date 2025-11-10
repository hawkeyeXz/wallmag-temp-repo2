import mongoose, { Document, models, Schema } from "mongoose";

export interface IProfiles extends Document {
    id_number: string;
    name: string;
    email: string;
    bio?: string;
    profile_picture_url?: string;
    social_links?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
        instagram?: string;
    };
    date_of_birth?: Date;
    password: string;
    role: "student" | "Professor" | "editor" | "admin";
    created_at?: Date;
    updated_at?: Date;
    last_login?: Date;
}

const ProfilesSchema = new Schema<IProfiles>(
    {
        id_number: { type: String, required: true, unique: true, trim: true, ref: "RegisteredUsers" },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true },
        bio: { type: String, required: false, trim: true },
        profile_picture_url: { type: String, required: false, trim: true },
        social_links: {
            linkedin: { type: String, required: false, trim: true },
            twitter: { type: String, required: false, trim: true },
            facebook: { type: String, required: false, trim: true },
            instagram: { type: String, required: false, trim: true },
        },
        date_of_birth: { type: Date, required: false },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["student", "Professor", "editor", "admin"],
            default: null,
            required: true,
        },
        last_login: { type: Date, required: false },
    },
    { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const Profiles = models.Profiles || mongoose.model<IProfiles>("Profiles", ProfilesSchema);
export default Profiles;
