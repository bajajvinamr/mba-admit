import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/checkout",
          "/evals",
          "/success",
          "/dashboard",
          "/portfolio",
          "/onboarding",
          "/settings",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/school/", "/schools", "/programs", "/rankings"],
        disallow: "/",
      },
    ],
    sitemap: "https://admitcompass.ai/sitemap.xml",
  };
}
