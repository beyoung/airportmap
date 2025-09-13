/**
 * Astro Middleware
 * Sets up database connection and other runtime configurations
 */

import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  // In development, we'll use a local database file
  // In production (Cloudflare Pages), the DB will be available in context.locals.runtime.env
  
  // For now, we'll just pass through - the actual DB setup will be handled
  // when we configure Cloudflare Pages deployment
  
  return next();
};