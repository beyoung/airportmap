import rss from '@astrojs/rss';
import { getAllBlogPosts } from '../../lib/blog';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllBlogPosts();
  
  return rss({
    title: 'AyaMap Airports Blog',
    description: 'Latest news, insights, and stories from the world of aviation and airports',
    site: context.site || 'https://airport.ayamap.com',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.description || '',
      author: post.data.author || 'AyaMap Team',
      link: `/blog/${post.slug}/`,
      categories: post.data.tags || [],
    })),
    customData: `<language>en-us</language>`,
  });
}