import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TripMate — Regional Travel & AI Concierge",
    short_name: "TripMate",
    description:
      "Plan seamlessly, ride freely, travel confidently with Matey Voice AI and zero-fee UPI checkout.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF9F5",
    theme_color: "#FF5E1E",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
