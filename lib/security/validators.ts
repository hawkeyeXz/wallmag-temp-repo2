import DOMPurify from "isomorphic-dompurify"

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized?: string
}

/**
 * Validate and sanitize post title
 */
export function validatePostTitle(title: string): ValidationResult {
  if (!title || typeof title !== "string") {
    return { valid: false, error: "Title is required" }
  }

  const trimmed = title.trim()

  if (trimmed.length < 3) {
    return { valid: false, error: "Title must be at least 3 characters" }
  }

  if (trimmed.length > 200) {
    return { valid: false, error: "Title must not exceed 200 characters" }
  }

  const sanitized = DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] })

  return { valid: true, sanitized }
}

/**
 * Validate post category
 */
export function validateCategory(category: string): ValidationResult {
  const validCategories = ["article", "poem", "artwork", "notice"]

  if (!validCategories.includes(category)) {
    return { valid: false, error: `Invalid category. Must be one of: ${validCategories.join(", ")}` }
  }

  return { valid: true }
}

/**
 * Validate submission type
 */
export function validateSubmissionType(type: string): ValidationResult {
  const validTypes = ["upload", "paste", "image_upload"]

  if (!validTypes.includes(type)) {
    return { valid: false, error: `Invalid submission type. Must be one of: ${validTypes.join(", ")}` }
  }

  return { valid: true }
}

/**
 * Validate and sanitize raw content (pasted text)
 */
export function validateRawContent(content: string, maxLength = 50000): ValidationResult {
  if (!content || typeof content !== "string") {
    return { valid: false, error: "Content is required" }
  }

  const trimmed = content.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: "Content cannot be empty" }
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Content exceeds maximum length of ${maxLength} characters` }
  }

  // Sanitize to prevent XSS
  const sanitized = DOMPurify.sanitize(trimmed)

  return { valid: true, sanitized }
}

/**
 * Validate and sanitize tags
 */
export function validateTags(tagsString: string, maxTags = 10): ValidationResult {
  if (!tagsString || typeof tagsString !== "string") {
    return { valid: true, sanitized: "" } // Tags are optional
  }

  const tags = tagsString
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)

  if (tags.length > maxTags) {
    return { valid: false, error: `Maximum ${maxTags} tags allowed` }
  }

  // Validate each tag
  for (const tag of tags) {
    if (tag.length < 2) {
      return { valid: false, error: "Each tag must be at least 2 characters" }
    }
    if (tag.length > 30) {
      return { valid: false, error: "Each tag must not exceed 30 characters" }
    }
    // Sanitize tag - remove any HTML/special chars
    if (!/^[a-z0-9_-]+$/.test(tag)) {
      return { valid: false, error: "Tags can only contain alphanumeric characters, hyphens, and underscores" }
    }
  }

  return { valid: true, sanitized: tags.join(",") }
}

/**
 * Validate rejection reason
 */
export function validateRejectionReason(reason: string): ValidationResult {
  if (!reason || typeof reason !== "string") {
    return { valid: false, error: "Rejection reason is required" }
  }

  const trimmed = reason.trim()

  if (trimmed.length < 10) {
    return { valid: false, error: "Rejection reason must be at least 10 characters" }
  }

  if (trimmed.length > 1000) {
    return { valid: false, error: "Rejection reason must not exceed 1000 characters" }
  }

  const sanitized = DOMPurify.sanitize(trimmed)

  return { valid: true, sanitized }
}

/**
 * Validate action field (for workflow actions)
 */
export function validateAction(action: string, allowedActions: string[]): ValidationResult {
  if (!action || typeof action !== "string") {
    return { valid: false, error: "Action is required" }
  }

  if (!allowedActions.includes(action)) {
    return { valid: false, error: `Invalid action. Must be one of: ${allowedActions.join(", ")}` }
  }

  return { valid: true }
}

/**
 * Validate MongoDB ObjectId
 */
export function validateObjectId(id: string): ValidationResult {
  // Check if it's a valid MongoDB ObjectId format (24 hex characters)
  if (!id || !/^[0-9a-f]{24}$/.test(id)) {
    return { valid: false, error: "Invalid ID format" }
  }

  return { valid: true }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: any, limit?: any): ValidationResult {
  const pageNum = Number.parseInt(page) || 1
  const limitNum = Number.parseInt(limit) || 10

  if (pageNum < 1) {
    return { valid: false, error: "Page must be greater than 0" }
  }

  if (limitNum < 1 || limitNum > 100) {
    return { valid: false, error: "Limit must be between 1 and 100" }
  }

  return { valid: true }
}

/**
 * Validate featured until date
 */
export function validateFeaturedUntilDate(dateString: string): ValidationResult {
  if (!dateString) {
    return { valid: true } // Optional field
  }

  const date = new Date(dateString)

  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" }
  }

  if (date <= new Date()) {
    return { valid: false, error: "Featured date must be in the future" }
  }

  return { valid: true }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: "Invalid email format" }
  }

  return { valid: true }
}
