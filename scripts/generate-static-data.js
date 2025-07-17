const { readFileSync, readdirSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

// Inline the post generation functions to avoid TypeScript import issues
async function parseMarkdown(content, slug) {
  const matter = require('gray-matter');
  const { data, content: markdownContent } = matter(content);
  
  return {
    title: data.title || '',
    date: data.date || '',
    description: data.description || '',
    categories: data.categories || [],
    authors: data.authors || [],
    content: markdownContent,
    slug,
    image: data.image,
    series: data.series || [],
  };
}

async function generateAllPosts() {
  try {
    const postsDirectory = join(process.cwd(), 'content', 'blog');
    const filenames = readdirSync(postsDirectory);
    
    const posts = await Promise.all(
      filenames
        .filter((name) => name.endsWith('.md'))
        .map(async (name) => {
          const slug = name.replace(/\.md$/, '');
          const fullPath = join(postsDirectory, name);
          const fileContents = readFileSync(fullPath, 'utf8');
          return await parseMarkdown(fileContents, slug);
        })
    );

    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

async function generatePost(slug) {
  try {
    const postsDirectory = join(process.cwd(), 'content', 'blog');
    const fullPath = join(postsDirectory, `${slug}.md`);
    const fileContents = readFileSync(fullPath, 'utf8');
    return await parseMarkdown(fileContents, slug);
  } catch {
    return null;
  }
}

function generateStaticSlugs() {
  try {
    const postsDirectory = join(process.cwd(), 'content', 'blog');
    const filenames = readdirSync(postsDirectory);
    
    return filenames
      .filter((name) => name.endsWith('.md'))
      .map((name) => name.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

async function main() {
  console.log('Generating static blog data...');
  
  // Create output directory
  const outputDir = join(process.cwd(), 'src', 'data');
  mkdirSync(outputDir, { recursive: true });
  
  // Generate all posts
  const posts = await generateAllPosts();
  writeFileSync(
    join(outputDir, 'posts.json'),
    JSON.stringify(posts, null, 2)
  );
  
  // Generate individual post files
  const slugs = generateStaticSlugs();
  const postsDir = join(outputDir, 'posts');
  mkdirSync(postsDir, { recursive: true });
  
  for (const slug of slugs) {
    const post = await generatePost(slug);
    if (post) {
      writeFileSync(
        join(postsDir, `${slug}.json`),
        JSON.stringify(post, null, 2)
      );
    }
  }
  
  // Copy series.json to data directory
  try {
    const seriesPath = join(process.cwd(), 'content', 'series.json');
    const seriesContent = readFileSync(seriesPath, 'utf8');
    writeFileSync(
      join(outputDir, 'series.json'),
      seriesContent
    );
    console.log('Copied series.json to data directory');
  } catch (error) {
    console.log('No series.json found or error copying it');
  }
  
  console.log(`Generated ${posts.length} posts`);
}

main().catch(console.error);
