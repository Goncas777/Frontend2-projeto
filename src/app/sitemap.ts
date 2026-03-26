import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://royelle.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${siteUrl}${routes.home}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}${routes.register}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}${routes.signIn}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}${routes.games.blackjack}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${routes.games.mines}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${routes.games.roulette}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${routes.games.slots}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
