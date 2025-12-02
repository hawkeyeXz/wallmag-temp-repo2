import mongoose, { Document, models, Schema } from "mongoose";

export interface IRegisteredUsers extends Document {
    name: string;
    id_number: string;
    email: string;
    phone?: string;
    department?: string;
    is_signed_up: boolean;
    role?: "student" | "professor" | "editor" | "admin";
}

const RegisteredUsersSchema = new Schema<IRegisteredUsers>(
    {
        name: { type: String, required: true, trim: true },
        id_number: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: false, lowercase: true, unique: true, trim: true },
        phone: { type: String, required: false, unique: true, trim: true },
        department: { type: String, required: false, trim: true },
        is_signed_up: { type: Boolean, default: false },
        role: { type: String, enum: ["student", "professor", "editor", "admin"], default: "student" },
    },
    { timestamps: true }
);

const RegisteredUsers =
    models.RegisteredUsers || mongoose.model<IRegisteredUsers>("RegisteredUsers", RegisteredUsersSchema);
export default RegisteredUsers;
