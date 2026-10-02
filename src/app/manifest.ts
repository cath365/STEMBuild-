import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STEMBuild: Robotics & IoT",
    short_name: "STEMBuild",
    description: "Hands-on STEM learning and practical skills assessment.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07111f",
    theme_color: "#07111f",
    categories: ["education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
