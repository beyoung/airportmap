import type { APIRoute } from 'astro';
import { getAllBlogPosts } from '../lib/blog';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getAllBlogPosts();
  const siteUrl = site || 'https://airport.ayamap.com';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  ${posts
    .map(
      (post) => `
  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${post.data.publishDate.toISOString()}</lastmod>
  </url>`
    )
    .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};