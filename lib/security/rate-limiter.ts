"use client"

import redis from "@/lib/redis"

const RATE_LIMITS = {
  LOGIN: { requests: 20, window: 3600 }, // 20 requests per hour
  SIGNUP: { requests: 60, window: 3600 }, // 60 requests per hour
  POST_CREATE: { requests: 50, window: 3600 }, // 50 posts per hour
  API_GENERAL: { requests: 100, window: 60 }, // 100 requests per minute
}

export async function checkRateLimit(key: string, type: keyof typeof RATE_LIMITS = "API_GENERAL") {
  const limit = RATE_LIMITS[type]
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, limit.window)
  }

  return current <= limit.requests
}

export function getRateLimitKey(identifier: string, type: string) {
  return `rate-limit:${type}:${identifier}`
}
