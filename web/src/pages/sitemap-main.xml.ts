import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
	const baseUrl = 'https://airport.ayamap.com';
	const currentDate = new Date().toISOString().split('T')[0];
	
	let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
	
	// Add main pages
	sitemap += `	<url>
		<loc>${baseUrl}/</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>1.0</priority>
	</url>
`;
	
	sitemap += `	<url>
		<loc>${baseUrl}/airports</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>
`;
	
	sitemap += `	<url>
		<loc>${baseUrl}/countries</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>
`;
	
	sitemap += `</urlset>`;
	
	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
		}
	});
};