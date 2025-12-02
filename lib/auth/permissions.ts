// lib/auth/permissions.ts
import Profiles from "@/app/models/Profiles";
import { NextResponse } from "next/server";
import { requireAuth } from "./middleware";

// FIXED: Changed "Professor" to "professor" to match DB models
export type Role = "student" | "professor" | "editor" | "admin" | "publisher";

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
    | "register_users"
    // Publisher permissions
    | "publish_post"
    | "unpublish_post"
    | "feature_post"
    // Admin permissions
    | "approve_designs"
    | "reject_designs"
    | "assign_editors"
    | "assign_publishers"
    | "delete_post" // FIXED: Renamed from delete_any_post to match API usage
    | "view_analytics"
    | "manage_users";

/**
 * Permission mapping for each role
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    student: ["create_post", "view_own_posts", "view_published", "like_post", "comment_post"],

    // FIXED: Lowercase "professor"
    professor: [
        "create_post",
        "view_own_posts",
        "view_published",
        "like_post",
        "comment_post",
        "view_pending_submissions",
    ],

    editor: [
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
    ],

    publisher: [
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
    ],

    admin: [
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
        "delete_post", // FIXED
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
 */
async function getProfileWithCache(id_number: string) {
    const redis = (await import("@/lib/redis")).default;

    // Try cache first
    const cacheKey = `profile:${id_number}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
        const profileData = JSON.parse(cached);
        return {
            ...profileData,
            _id: profileData._id,
            role: profileData.role as Role,
        };
    }

    const profile = await Profiles.findOne({ id_number }).lean();

    if (profile) {
        await redis.set(cacheKey, JSON.stringify(profile), { EX: 3600 });
    }

    return profile;
}

/**
 * Invalidate profile cache
 */
export async function invalidateProfileCache(id_number: string) {
    const redis = (await import("@/lib/redis")).default;
    await redis.del(`profile:${id_number}`);
}

/**
 * Middleware: require specific permission
 */
export async function requirePermission(permission: Permission) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return { error: authError, user: null, profile: null };
    }

    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    if (!hasPermission(profile.role, permission)) {
        return {
            error: NextResponse.json({ message: "Insufficient permissions", required: permission }, { status: 403 }),
            user: null,
            profile: null,
        };
    }

    return { error: null, user, profile };
}

/**
 * Middleware: require any of the permissions
 */
export async function requireAnyPermission(permissions: Permission[]) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return { error: authError, user: null, profile: null };
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

    return { error: null, user, profile };
}

/**
 * Middleware: require all permissions
 */
export async function requireAllPermissions(permissions: Permission[]) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return { error: authError, user: null, profile: null };
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

    return { error: null, user, profile };
}

/**
 * Middleware: require specific role
 */
export async function requireRole(allowedRoles: Role[]) {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return { error: authError, user: null, profile: null };
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

    return { error: null, user, profile };
}

/**
 * Get authenticated profile
 */
export async function getAuthenticatedProfile() {
    const { error: authError, user } = await requireAuth();
    if (authError) {
        return { error: authError, user: null, profile: null };
    }

    const profile = await getProfileWithCache(user.id_number);
    if (!profile) {
        return {
            error: NextResponse.json({ message: "Profile not found" }, { status: 404 }),
            user: null,
            profile: null,
        };
    }

    return { error: null, user, profile };
}
