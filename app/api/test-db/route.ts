import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/mongoose";

import Profiles from "@/app/models/Profiles";
import RegisteredUsers from "@/app/models/RegisteredUser";

export async function GET() {
    try {
        await dbConnect();

        const count = await RegisteredUsers.countDocuments();
        const users = await Profiles.find();
        return NextResponse.json(
            { message: `Database connected successfully. Registered Users count: ${count}, and users: ${users}` },
            { status: 200 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Database connection failed", error }, { status: 500 });
    }
}
