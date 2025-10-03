import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

/**
 * 获取所有已发布的博客文章
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => {
    return data.draft !== true;
  });
  
  return posts.sort((a, b) => 
    new Date(b.data.publishDate).getTime() - new Date(a.data.publishDate).getTime()
  );
}

/**
 * 根据 slug 获取单篇博客文章
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getAllBlogPosts();
  return posts.find(post => post.slug === slug);
}

/**
 * 获取指定标签的博客文章
 */
export async function getBlogPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts.filter(post => 
    post.data.tags && post.data.tags.includes(tag)
  );
}

/**
 * 获取所有使用的标签
 */
export async function getAllTags(): Promise<string[]> {
  const posts = await getAllBlogPosts();
  const tags = new Set<string>();
  
  posts.forEach(post => {
    if (post.data.tags) {
      post.data.tags.forEach(tag => tags.add(tag));
    }
  });
  
  return Array.from(tags).sort();
}

/**
 * 获取最新的 N 篇博客文章
 */
export async function getLatestBlogPosts(count: number = 5): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts.slice(0, count);
}

/**
 * 获取相关的博客文章（基于标签匹配）
 */
export async function getRelatedPosts(currentPost: BlogPost, count: number = 3): Promise<BlogPost[]> {
  const allPosts = await getAllBlogPosts();
  const currentTags = currentPost.data.tags || [];
  
  if (currentTags.length === 0) {
    // 如果当前文章没有标签，返回最新的文章
    return allPosts
      .filter(post => post.slug !== currentPost.slug)
      .slice(0, count);
  }
  
  // 计算每篇文章与当前文章的标签匹配度
  const postsWithScore = allPosts
    .filter(post => post.slug !== currentPost.slug)
    .map(post => {
      const postTags = post.data.tags || [];
      const matchingTags = postTags.filter(tag => currentTags.includes(tag));
      return {
        post,
        score: matchingTags.length
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  
  const relatedPosts = postsWithScore.slice(0, count).map(item => item.post);
  
  // 如果相关文章不够，用最新文章补充
  if (relatedPosts.length < count) {
    const additionalPosts = allPosts
      .filter(post => 
        post.slug !== currentPost.slug && 
        !relatedPosts.some(related => related.slug === post.slug)
      )
      .slice(0, count - relatedPosts.length);
    
    relatedPosts.push(...additionalPosts);
  }
  
  return relatedPosts;
}

/**
 * 格式化日期为可读格式
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 计算阅读时间（基于字数估算）
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * 生成文章摘要
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
  // 移除 Markdown 语法
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // 移除标题
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
    .replace(/\*(.*?)\*/g, '$1') // 移除斜体
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接，保留文本
    .replace(/`(.*?)`/g, '$1') // 移除行内代码
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/\n+/g, ' ') // 将换行符替换为空格
    .trim();
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}