import redis from "@/lib/redis";

export async function GET() {
    try {
        // Set a key
        await redis.set("mykey", "Hello Redis");

        // Get the key
        const value = await redis.get("keys*");

        // Return a JSON response
        return new Response(JSON.stringify({ value }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: "Redis operation failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
