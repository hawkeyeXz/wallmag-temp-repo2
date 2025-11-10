import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL!;
if (!redisUrl) {
    throw new Error("REDIS_URL is not defined, ensure you have set it in your environment variables.");
}

const client = createClient({
    url: redisUrl,
});

client.on("error", err => console.error("Redis error:", err));

await client.connect();

export default client;
