// lib/security/monitoring.ts
import redis from "@/lib/redis";

interface SecurityEvent {
    type: string;
    ip?: string;
    id_number?: string;
    email?: string;
    attempt?: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

interface AlertThresholds {
    failed_logins: number;
    csrf_failures: number;
    account_lockouts: number;
    suspicious_ips: number;
}

const ALERT_THRESHOLDS: AlertThresholds = {
    failed_logins: 10, // 10 failed logins in window
    csrf_failures: 5, // 5 CSRF failures in window
    account_lockouts: 3, // 3 lockouts in window
    suspicious_ips: 50, // 50 requests from IP in window
};

const MONITORING_WINDOW = 3600; // 1 hour window

export async function logSuspiciousActivity(event: SecurityEvent): Promise<void> {
    try {
        // Store event in Redis with timestamp
        const eventKey = `security:event:${event.type}:${Date.now()}`;
        await redis.set(eventKey, JSON.stringify(event), { EX: 86400 }); // Keep for 24 hours

        // Increment counter for this event type
        const counterKey = `security:counter:${event.type}`;
        const count = await redis.incr(counterKey);
        if (count === 1) {
            await redis.expire(counterKey, MONITORING_WINDOW);
        }

        // Check if we need to send alerts
        await checkAndAlert(event.type, count);

        // Track by IP if available
        if (event.ip) {
            const ipKey = `security:ip:${event.ip}`;
            const ipCount = await redis.incr(ipKey);
            if (ipCount === 1) {
                await redis.expire(ipKey, MONITORING_WINDOW);
            }

            if (ipCount > ALERT_THRESHOLDS.suspicious_ips) {
                await sendSecurityAlert({
                    severity: "high",
                    type: "suspicious_ip",
                    message: `IP ${event.ip} has triggered ${ipCount} security events in the last hour`,
                    data: { ip: event.ip, count: ipCount },
                });
            }
        }

        // Log to console for development/monitoring
        console.warn(`[SECURITY] ${event.type}:`, {
            ip: event.ip,
            id_number: event.id_number,
            timestamp: event.timestamp.toISOString(),
        });
    } catch (error) {
        console.error("[ERROR] Failed to log suspicious activity:", error);
    }
}

async function checkAndAlert(eventType: string, count: number): Promise<void> {
    const threshold = getThreshold(eventType);

    if (threshold && count >= threshold) {
        await sendSecurityAlert({
            severity: "medium",
            type: eventType,
            message: `Alert: ${eventType} threshold reached (${count}/${threshold})`,
            data: { count, threshold, window: MONITORING_WINDOW },
        });
    }
}

function getThreshold(eventType: string): number | null {
    switch (eventType) {
        case "failed_otp_attempt":
        case "failed_login":
            return ALERT_THRESHOLDS.failed_logins;
        case "csrf_validation_failed":
            return ALERT_THRESHOLDS.csrf_failures;
        case "account_locked_too_many_attempts":
            return ALERT_THRESHOLDS.account_lockouts;
        default:
            return null;
    }
}

interface SecurityAlert {
    severity: "low" | "medium" | "high" | "critical";
    type: string;
    message: string;
    data?: Record<string, any>;
}

async function sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
        // Store alert
        const alertKey = `security:alert:${Date.now()}`;
        await redis.set(alertKey, JSON.stringify(alert), { EX: 604800 }); // Keep for 7 days

        console.error(`[SECURITY ALERT - ${alert.severity.toUpperCase()}]`, alert.message);

        // TODO: Implement your alert mechanism
        // Options:
        // 1. Send email to admin
        // 2. Send to Slack/Discord webhook
        // 3. Send to monitoring service (DataDog, Sentry, etc.)
        // 4. Trigger PagerDuty alert

        if (process.env.SECURITY_WEBHOOK_URL) {
            await fetch(process.env.SECURITY_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...alert,
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV,
                }),
            });
        }

        // If critical, you might want to trigger immediate action
        if (alert.severity === "critical") {
            // e.g., temporarily block an IP, send SMS to admin, etc.
            console.error("[CRITICAL ALERT] Immediate action may be required!");
        }
    } catch (error) {
        console.error("[ERROR] Failed to send security alert:", error);
    }
}

// Get security dashboard data
export async function getSecurityDashboard(hours = 24): Promise<any> {
    try {
        const now = Date.now();
        const windowStart = now - hours * 3600 * 1000;

        // Scan for all security events in the time window
        const eventKeys = await redis.keys(`security:event:*`);
        const events: SecurityEvent[] = [];

        for (const key of eventKeys) {
            const timestamp = parseInt(key.split(":").pop() || "0");
            if (timestamp >= windowStart) {
                const data = await redis.get(key);
                if (data) {
                    events.push(JSON.parse(data));
                }
            }
        }

        // Aggregate by type
        const byType: Record<string, number> = {};
        const byIp: Record<string, number> = {};

        for (const event of events) {
            byType[event.type] = (byType[event.type] || 0) + 1;
            if (event.ip) {
                byIp[event.ip] = (byIp[event.ip] || 0) + 1;
            }
        }

        return {
            totalEvents: events.length,
            timeWindow: `${hours} hours`,
            eventsByType: byType,
            topIPs: Object.entries(byIp)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([ip, count]) => ({ ip, count })),
            recentEvents: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20),
        };
    } catch (error) {
        console.error("[ERROR] Failed to generate security dashboard:", error);
        return null;
    }
}

// Manual IP blocking
export async function blockIP(ip: string, durationSeconds = 86400): Promise<void> {
    const blockKey = `security:blocked:ip:${ip}`;
    await redis.set(blockKey, "1", { EX: durationSeconds });
    console.warn(`[SECURITY] IP blocked for ${durationSeconds}s: ${ip}`);
}

export async function isIPBlocked(ip: string): Promise<boolean> {
    const blockKey = `security:blocked:ip:${ip}`;
    const exists = await redis.exists(blockKey);
    return exists === 1;
}

export async function unblockIP(ip: string): Promise<void> {
    const blockKey = `security:blocked:ip:${ip}`;
    await redis.del(blockKey);
    console.log(`[SECURITY] IP unblocked: ${ip}`);
}
