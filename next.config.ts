/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https:",
                            "font-src 'self' data:",
                            "connect-src 'self' https:",
                            "frame-src 'self' https://*.public.blob.vercel-storage.com https://e4xpii843ilwjk9n.public.blob.vercel-storage.com",
                        ].join("; "),
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
