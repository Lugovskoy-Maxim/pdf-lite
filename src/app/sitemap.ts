import type { MetadataRoute } from "next";
import { TOOL_PATHS } from "./tools-config";
import { getSiteUrl } from "./lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const toolPages = TOOL_PATHS.map((path) => ({
    url: `${baseUrl}/${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...toolPages,
  ];
}
