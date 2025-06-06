/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';


interface MarkdownProps {
  content: string;
}

// Helper function to recursively extract text from React elements
function extractTextFromElement(element: any): string {
  if (typeof element === 'string') {
    return element;
  }
  
  if (Array.isArray(element)) {
    return element.map(extractTextFromElement).join('');
  }
  
  if (element?.props?.children) {
    return extractTextFromElement(element.props.children);
  }
  
  return '';
}

// Separate component for code blocks with copy functionality
function CodeBlock({ children }: { children: any }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    // Extract text content from the entire children structure
    const textContent = extractTextFromElement(children);
    
    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group mb-4">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        {children}
      </pre>
    </div>
  );
}

// Custom components for react-markdown
const markdownComponents = {
  h1: ({ children, id }: any) => (
    <h1 id={id} className="text-3xl font-bold text-black mb-6 mt-8">
      {children}
    </h1>
  ),
  h2: ({ children, id }: any) => (
    <h2 id={id} className="text-2xl font-bold text-black mb-4 mt-6">
      {children}
    </h2>
  ),
  h3: ({ children, id }: any) => (
    <h3 id={id} className="text-xl font-semibold text-black mb-3 mt-5">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-gray-800 leading-relaxed mb-4">
      {children}
    </p>
  ),
  a: ({ href, children }: any) => (
    <Link 
      href={href || '#'} 
      className="text-black underline hover:no-underline transition-all duration-200"
    >
      {children}
    </Link>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-outside mb-4 space-y-2 text-gray-800 ml-6">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-outside mb-4 space-y-3 text-gray-800 ml-6">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed pl-2">
      {children}
    </li>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-gray-400 pl-4 italic text-gray-700 mb-4">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: any) => {
    const isInline = !className;
    
    if (isInline) {
      return (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">
          {children}
        </code>
      );
    }
    
    return (
      <code className={className}>
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => <CodeBlock>{children}</CodeBlock>,
  img: ({ src, alt }: any) => {
    if (!src) return null;
    
    // Handle local image paths - convert ./images/ to /images/
    let imageSrc = src;
    if (src.startsWith('./images/')) {
      imageSrc = src.replace('./', '/');
    }
    
    // For video files, render as video element instead of Image
    if (imageSrc.endsWith('.mp4') || imageSrc.endsWith('.webm') || imageSrc.endsWith('.mov')) {
      return (
        <div className="mb-4">
          <video
            src={imageSrc}
            controls
            width={800}
            height={400}
            className="rounded-lg w-full max-w-3xl"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    
    return (
      <div className="mb-4">
        <Image
          src={imageSrc}
          alt={alt || ''}
          width={800}
          height={400}
          className="rounded-lg"
        />
      </div>
    );
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-300">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-gray-300 px-4 py-2">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="border-t border-gray-300 my-8" />
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-black">
      {children}
    </strong>
  ),
  em: ({ children }: any) => (
    <em className="italic">
      {children}
    </em>
  ),
};

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
