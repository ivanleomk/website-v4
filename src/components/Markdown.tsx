/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";

interface MarkdownProps {
  content: string;
}

// Helper function to recursively extract text from React elements
function extractTextFromElement(element: any): string {
  if (typeof element === "string") {
    return element;
  }

  if (Array.isArray(element)) {
    return element.map(extractTextFromElement).join("");
  }

  if (element?.props?.children) {
    return extractTextFromElement(element.props.children);
  }

  return "";
}

// Separate component for inline/block code with Shiki highlighting
function CodeElement({
  children,
  className,
}: {
  children: any;
  className?: string;
}) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const isInline = !className;

  useEffect(() => {
    if (className && children) {
      const fullLanguage = className.replace("language-", "");
      // Support both "ts-collapsible" and "ts collapsible" formats
      const language = fullLanguage.split(/[-\s]/)[0];
      const codeText = extractTextFromElement(children);

      codeToHtml(codeText, {
        lang: language,
        theme: "github-light",
        transformers: [
          {
            pre(node) {
              node.properties.style = "background-color: white; margin: 0;";
            },
          },
        ],
      })
        .then((html) => {
          setHighlightedCode(html);
        })
        .catch(() => {
          // Fallback if language not supported
          setHighlightedCode(`<pre><code>${codeText}</code></pre>`);
        });
    }
  }, [className, children]);

  if (isInline) {
    return (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">
        {children}
      </code>
    );
  }

  if (highlightedCode) {
    return <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
  }

  return <code className={className}>{children}</code>;
}

// Language icon mapping
const getLanguageIcon = (lang?: string): string => {
  const icons: Record<string, string> = {
    javascript: "JS",
    js: "JS",
    typescript: "TS",
    ts: "TS",
    tsx: "TSX",
    jsx: "JSX",
    python: "PY",
    py: "PY",
    go: "GO",
    rust: "RS",
    rs: "RS",
    java: "JAVA",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    cs: "C#",
    ruby: "RB",
    rb: "RB",
    php: "PHP",
    swift: "SWIFT",
    kotlin: "KT",
    kt: "KT",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    markdown: "MD",
    md: "MD",
    sql: "SQL",
  };
  return icons[lang?.toLowerCase() || ""] || lang?.toUpperCase() || "";
};

// Separate component for code blocks with copy functionality
function CodeBlock({
  children,
  title,
  language,
}: {
  children: any;
  title?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textContent = extractTextFromElement(children);
    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isHighlightedHtml =
    typeof children === "string" ||
    (children?.type === "div" && children?.props?.dangerouslySetInnerHTML);

  const CodeContent = isHighlightedHtml ? "div" : "pre";

  // Check if it's a terminal/bash type
  const isTerminal =
    language === "bash" ||
    language === "sh" ||
    language === "shell" ||
    language === "zsh";

  const languageIcon =
    !isTerminal && language ? getLanguageIcon(language) : null;

  // For terminal, render with $ prompt
  const renderTerminalContent = () => {
    const textContent = extractTextFromElement(children);
    const lines = textContent.split("\n");

    return (
      <pre className="px-4 py-2 text-sm font-mono leading-6 w-full bg-black text-gray-100 max-h-96 overflow-y-auto m-0 overflow-x-auto rounded-none">
        {lines.map((line, index) => (
          <div key={index}>
            {index === 0 && line.trim() && (
              <span className="text-green-400 mr-2">$ </span>
            )}
            <span className={index === 0 ? "text-white" : "text-gray-300"}>
              {line}
            </span>
          </div>
        ))}
      </pre>
    );
  };

  const baseClasses =
    "px-6 py-0 text-base leading-relaxed w-full max-h-96 overflow-y-auto m-0 overflow-x-auto whitespace-pre-wrap break-words";
  const highlightClasses = isHighlightedHtml
    ? "text-gray-900"
    : "text-gray-800";

  return (
    <div className="mb-4 max-w-3xl mx-auto">
      <div className="rounded-lg overflow-hidden">
        <div
          className={`px-4 py-2 flex items-center justify-between ${
            isTerminal ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center group cursor-pointer">
                <span className="text-red-950 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                  ×
                </span>
              </div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 flex items-center justify-center group cursor-pointer">
                <span className="text-yellow-950 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                  −
                </span>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center group cursor-pointer">
                <span className="text-green-950 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                  ⤢
                </span>
              </div>
            </div>
            {!isTerminal && languageIcon && (
              <span className="text-xs font-mono ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                {languageIcon}
              </span>
            )}
            {title && (
              <span
                className={`text-sm font-mono ml-2 ${
                  isTerminal ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {title}
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className={`px-2 py-1 text-xs transition-colors ${
              isTerminal
                ? "text-gray-300 hover:text-white"
                : "text-gray-600 hover:text-black"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {isTerminal ? (
          renderTerminalContent()
        ) : (
          <CodeContent
            className={`
              ${baseClasses} bg-white ${highlightClasses}
            `}
          >
            {children}
          </CodeContent>
        )}
      </div>
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
    <h2 id={id} className="text-2xl font-bold text-black mb-4 mt-12">
      {children}
    </h2>
  ),
  h3: ({ children, id }: any) => (
    <h3 id={id} className="text-xl font-semibold text-black mb-3 mt-8">
      {children}
    </h3>
  ),
  p: ({ children }: any) => {
    // Check if paragraph only contains an image
    const isImageOnly = Array.isArray(children)
      ? children.length === 1 && children[0]?.type?.name === "img"
      : children?.type?.name === "img";

    if (isImageOnly) {
      return <div className="flex justify-center mb-6">{children}</div>;
    }

    return (
      <p className="text-gray-700 text-xl leading-9 mb-6 font-serif">
        {children}
      </p>
    );
  },
  a: ({ href, children }: any) => (
    <Link
      href={href || "#"}
      className="text-black underline hover:no-underline transition-all duration-200"
    >
      {children}
    </Link>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-outside mb-6 space-y-2 text-gray-700 text-xl ml-6 font-serif">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-outside mb-6 space-y-2 text-gray-700 text-xl ml-6 font-serif">
      {children}
    </ol>
  ),
  li: ({ children }: any) => <li className="leading-9 pl-2">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-gray-400 pl-6 italic text-gray-700 text-xl mb-6 font-serif leading-9">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: any) => (
    <CodeElement className={className}>{children}</CodeElement>
  ),
  pre: ({ children, node }: any) => {
    // Extract title from meta string
    const meta =
      children?.props?.node?.data?.meta || children?.props?.node?.meta || "";
    const titleMatch = meta.match(/title="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : undefined;

    // Extract language from className
    const className = children?.props?.className || "";
    const language = className.replace("language-", "").split(/[-\s]/)[0];

    return (
      <CodeBlock title={title} language={language}>
        {children}
      </CodeBlock>
    );
  },
  img: ({ src, alt }: any) => {
    if (!src) return null;

    // Handle local image paths - convert ./images/ to /images/
    let imageSrc = src;
    if (src.startsWith("./images/")) {
      imageSrc = src.replace("./", "/");
    }

    // For video files, render as video element instead of Image
    if (
      imageSrc.endsWith(".mp4") ||
      imageSrc.endsWith(".webm") ||
      imageSrc.endsWith(".mov")
    ) {
      return (
        <video
          src={imageSrc}
          controls
          width={800}
          height={400}
          className="rounded-lg w-full max-w-3xl"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <Image
        src={imageSrc}
        alt={alt || ""}
        width={800}
        height={400}
        className="rounded-lg"
      />
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
    <td className="border border-gray-300 px-4 py-2">{children}</td>
  ),
  hr: () => <hr className="border-t border-gray-300 my-8" />,
  strong: ({ children }: any) => (
    <strong className="font-semibold text-black">{children}</strong>
  ),
  em: ({ children }: any) => <em className="italic">{children}</em>,
};

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
