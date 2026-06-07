import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VeRdex",
    short_name: "VeRdex",
    description: "The Human Prediction Network. Verified humans forecast reality — bet WLD, challenge 1v1, copy top forecasters.",
    start_url: "/",
    display: "standalone",
    background_color: "#07091a",
    theme_color: "#6366f1",
    icons: [{ src: "/icon-1024.png", sizes: "1024x1024", type: "image/png" }],
  };
}
