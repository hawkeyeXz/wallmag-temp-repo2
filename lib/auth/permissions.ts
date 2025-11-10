// lib/auth/permissions.ts
import Profiles from "@/app/models/Profiles";
import { NextResponse } from "next/server";
import { requireAuth } from "./middleware";

export type Role = "student" | "Professor" | "editor" | "admin" | "publisher";

export type Permission =
    // Student permissions
    | "create_post"
    | "view_own_posts"
    | "view_published"
    | "like_post"
    | "comment_post"
    // Editor permissions
    | "view_pending_submissions"
    | "accept_reject_submissions"
    | "download_original_files"
    | "upload_designed_version"
    | "view_all_posts"
    | "register_users" // NEW: Editor can register students
    // Publisher permissions
    | "publish_post"
    | "unpublish_post"
    | "feature_post"
    // Admin permissions
    | "approve_designs"
    | "reject_designs"
    | "assign_editors"
    | "assign_publishers"
    | "delete_any_post"
    | "view_analytics"
    | "manage_users";

/**
 * Permission mapping for each role
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    student: ["create_post", "view_own_posts", "view_published", "like_post", "comment_post"],

    Professor: [
        "create_post",
        "view_own_posts",
        "view_published",
        "like_post",
        "comment_post",
        // Professors can also view pending submissions (optional)
        "view_pending_submissions",
    ],

    editor: [
        // All student permissions
        "create_post",
        "view_own_posts",
        "view_published",
        "like_post",
        "comment_post",
        // Editor-specific
        "view_pending_submissions",
        "accept_reject_submissions",
        "download_original_files",
        "upload_designed_version",
        "view_all_posts",
        "register_users", // NEW: Can register students
    ],

    publisher: [
        // All editor permissions
        "create_post",
        "view_own_posts",
        "view_published",
        "like_post",
        "comment_post",
        "view_pending_submissions",
        "accept_reject_submissions",
        "download_original_files",
        "upload_designed_version",
        "view_all_posts",
        "register_users",
        // Publisher-specific (can publish directly)
        "publish_post",
        "unpublish_post",
        "feature_post",
    ],

    admin: [
        // All permissions
        "create_post",
        "view_own_posts",
        "view_published",
        "like_post",
        "comment_post",
        "view_pending_submissions",
        "accept_reject_submissions",
        "download_original_files",
        "upload_designed_version",
        "view_all_posts",
        "register_users",
        "publish_post",
        "unpublish_post",
        "feature_post",
        "approve_designs",
        "reject_designs",
        "assign_editors",
        "assign_publishers",
        "delete_any_post",
        "view_analytics",
        "manage_users",
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(perm => hasPermission(role, perm));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(perm => hasPermission(role, perm));
}

/**
 * Get profile from cache or database
 * @param id_number User ID number
 * @returns Profile document
 */
async function getProfileWithCache(id_number: string) {
    const redis = (await import("@/lib/redis")).default;

    // Try cache first
    const cacheKey = `profile:${id_number}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
        // Parse cached profile and convert to Mongoose document-like object
        const profileData = JSON.parse(cached);
        return {
            ...profileData,
            _id: profileData._id,
            role: profileData.role as Role,
        };
    }

    // Cache miss - fetch from database
    const profile = await Profiles.findOne({ id_number }).lean(); // .lean() for better performance

    if (profile) {
        // Cache for 1 hour
        await redis.set(cacheKey, JSON.stringify(profile), { EX: 3600 });
    }

    return profile;
}

/**
 * Invalidate profile cache (call this when profile is updated)
 */
export async function invalidateProfileCache(id_number: string) {
    const redis = (await import("@/lib/redis")).default;
    await redis.del(`profile:${id_number}`);
}

/**
 * Middleware to require authentication and specific permission
 * Use this in API routes that need permission checks
 */
export async function requirePermission(permission: Permission) {
    // First, check authentication
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return {
            error: authError,
            user: null,
            profile: null,
        };
    }

    // Fetch user profile from cache or database
    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    // Check permission
    if (!hasPermission(profile.role, permission)) {
        return {
            error: NextResponse.json({ message: "Insufficient permissions", required: permission }, { status: 403 }),
            user: null,
            profile: null,
        };
    }

    return {
        error: null,
        user,
        profile,
    };
}

/**
 * Middleware to require authentication and ANY of the specified permissions
 */
export async function requireAnyPermission(permissions: Permission[]) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return {
            error: authError,
            user: null,
            profile: null,
        };
    }

    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    if (!hasAnyPermission(profile.role, permissions)) {
        return {
            error: NextResponse.json(
                { message: "Insufficient permissions", required_one_of: permissions },
                { status: 403 }
            ),
            user: null,
            profile: null,
        };
    }

    return {
        error: null,
        user,
        profile,
    };
}

/**
 * Middleware to require authentication and ALL specified permissions
 */
export async function requireAllPermissions(permissions: Permission[]) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return {
            error: authError,
            user: null,
            profile: null,
        };
    }

    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    if (!hasAllPermissions(profile.role, permissions)) {
        return {
            error: NextResponse.json(
                { message: "Insufficient permissions", required_all: permissions },
                { status: 403 }
            ),
            user: null,
            profile: null,
        };
    }

    return {
        error: null,
        user,
        profile,
    };
}

/**
 * Middleware to require specific role(s)
 */
export async function requireRole(allowedRoles: Role[]) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return {
            error: authError,
            user: null,
            profile: null,
        };
    }

    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    if (!allowedRoles.includes(profile.role)) {
        return {
            error: NextResponse.json({ message: "Access denied", allowed_roles: allowedRoles }, { status: 403 }),
            user: null,
            profile: null,
        };
    }

    return {
        error: null,
        user,
        profile,
    };
}

/**
 * Get user's profile with role (for client-side checks)
 * Use this in API routes that just need to know the user's role
 */
export async function getAuthenticatedProfile() {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return {
            error: authError,
            user: null,
            profile: null,
        };
    }

    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    return {
        error: null,
        user,
        profile,
    };
}
