import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore
}

// Extract exact Supabase hostname from environment variable to replace *.supabase.co wildcard
let supabaseHostname = undefined;
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    // Ignore invalid URL
  }
}

const remotePatterns = [
  ...(supabaseHostname
    ? [
        {
          protocol: "https",
          hostname: supabaseHostname,
        },
      ]
    : [
        {
          protocol: "https",
          hostname: "*.supabase.co",
        },
      ]),
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
  },
  ...(process.env.NODE_ENV !== "production"
    ? [
        {
          protocol: "http",
          hostname: "127.0.0.1",
        },
        {
          protocol: "http",
          hostname: "localhost",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
