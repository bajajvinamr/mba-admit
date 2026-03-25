import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/checkout", "/evals", "/success"],
      },
    ],
    sitemap: "https://admitcompass.ai/sitemap.xml",
  };
}
