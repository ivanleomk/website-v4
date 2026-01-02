/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, ReactNode } from "react";
import { codeToHtml } from "shiki";
import { ChinesePoetryReverser } from "./ChinesePoetryReverser";
import { LCSVisualization } from "./LCSVisualization";
import { SFTPipelineDiagram } from "./diagrams/SFTPipelineDiagram";
import { SFTResultsChart } from "./SFTResultsChart";
import { RewardsDiagram } from "./diagrams/RewardsDiagram";
import { RLPipelineDiagram } from "./diagrams/RLPipelineDiagram";

const customComponents: Record<string, React.FC> = {
  ChinesePoetryReverser,
  // @ts-expect-error Type mismatch for component
  LCSVisualization,
  SFTPipelineDiagram,
  SFTResultsChart,
  RewardsDiagram,
  RLPipelineDiagram,
};

interface MarkdownProps {
  content: string;
}

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
          setHighlightedCode(`<pre><code>${codeText}</code></pre>`);
        });
    }
  }, [className, children]);

  if (isInline) {
    return (
      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">
        {children}
      </code>
    );
  }

  if (highlightedCode) {
    return <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
  }

  return <code className={className}>{children}</code>;
}

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

  const isTerminal =
    language === "bash" ||
    language === "sh" ||
    language === "shell" ||
    language === "zsh";

  const isPlainText = language === "text" || language === "txt";

  const languageIcon =
    !isTerminal && !isPlainText && language ? getLanguageIcon(language) : null;

  const renderTerminalContent = () => {
    const textContent = extractTextFromElement(children);
    const lines = textContent.split("\n").filter((line, index, arr) => {
      if (index === 0 && line === "") return false;
      if (index === arr.length - 1 && line === "") return false;
      return true;
    });

    return (
      <pre
        className="px-3 py-2 text-[11px] leading-4 bg-[#1a1a1a] text-gray-100 max-h-80 overflow-y-auto m-0 overflow-x-auto"
        style={{
          fontFamily:
            "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace",
        }}
      >
        {lines.map((line, index) => (
          <div key={index}>
            <span className="text-gray-100">{line}</span>
          </div>
        ))}
      </pre>
    );
  };

  const baseClasses =
    "px-4 py-3 text-sm leading-relaxed w-full max-h-96 overflow-y-auto m-0 overflow-x-auto whitespace-pre-wrap break-words";
  const highlightClasses = isHighlightedHtml
    ? "text-gray-900"
    : "text-gray-800";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg overflow-hidden ${
          isTerminal
            ? "border border-[#3a3a3a] w-3/4 mx-auto"
            : "border border-gray-200"
        }`}
      >
        <div
          className={`px-3 py-1.5 flex items-center justify-between ${
            isTerminal ? "bg-[#2a2a2a]" : "bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isTerminal ? "bg-[#ff5f56]" : "bg-gray-300"
                }`}
              />
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isTerminal ? "bg-[#ffbd2e]" : "bg-gray-300"
                }`}
              />
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isTerminal ? "bg-[#27c93f]" : "bg-gray-300"
                }`}
              />
            </div>
            {!isTerminal && languageIcon && (
              <span className="text-xs font-mono ml-2 text-gray-500">
                {languageIcon}
              </span>
            )}
            {title && (
              <span
                className={`text-xs font-mono ml-2 ${
                  isTerminal ? "text-gray-300" : "text-gray-500"
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
                : "text-gray-500 hover:text-black"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {isTerminal ? (
          renderTerminalContent()
        ) : isPlainText ? (
          <pre className={`${baseClasses} bg-white text-black font-mono`}>
            {extractTextFromElement(children)}
          </pre>
        ) : (
          <CodeContent
            className={`${baseClasses} bg-white ${highlightClasses}`}
          >
            {children}
          </CodeContent>
        )}
      </div>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children, id }: any) => (
    <h1
      id={id}
      className="text-3xl font-serif font-medium text-black mb-6 mt-12"
    >
      {children}
    </h1>
  ),
  h2: ({ children, id }: any) => (
    <h2
      id={id}
      className="text-2xl font-serif font-medium text-black mb-4 mt-12"
    >
      {children}
    </h2>
  ),
  h3: ({ children, id }: any) => (
    <h3 id={id} className="text-xl font-serif font-medium text-black mb-3 mt-8">
      {children}
    </h3>
  ),
  p: ({ children }: any) => {
    const isImageOnly = Array.isArray(children)
      ? children.length === 1 && children[0]?.type?.name === "img"
      : children?.type?.name === "img";

    if (isImageOnly) {
      return <div className="flex justify-center mb-6">{children}</div>;
    }

    return (
      <p className="text-gray-700 text-base leading-7 mb-6 font-serif">
        {children}
      </p>
    );
  },
  a: ({ href, children }: any) => (
    <Link
      href={href || "#"}
      className="text-black underline underline-offset-2 hover:text-gray-600 transition-colors"
    >
      {children}
    </Link>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-outside mb-6 space-y-1.5 text-gray-700 text-base ml-6 font-serif">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-outside mb-6 space-y-1.5 text-gray-700 text-base ml-6 font-serif">
      {children}
    </ol>
  ),
  li: ({ children }: any) => <li className="leading-7 pl-1">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-gray-300 pl-6 italic text-gray-600 text-base mb-6 font-serif leading-7">
      {children}
    </blockquote>
  ),
  code: ({ children, className }: any) => (
    <CodeElement className={className}>{children}</CodeElement>
  ),
  pre: ({ children }: any) => {
    const meta =
      children?.props?.node?.data?.meta || children?.props?.node?.meta || "";
    const titleMatch = meta.match(/title="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : undefined;

    const className = children?.props?.className || "";
    const language = className.replace("language-", "").split(/[-\s]/)[0];

    return (
      <CodeBlock title={title} language={language}>
        {children}
      </CodeBlock>
    );
  },
  img: ({ src, alt, width, height }: any) => {
    if (!src) return null;

    let imageSrc = src;
    if (src.startsWith("./images/")) {
      imageSrc = src.replace("./", "/");
    }

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
          className="rounded-lg w-full"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    const imgWidth = width ? parseInt(width, 10) : 800;
    const imgHeight = height ? parseInt(height, 10) : 400;

    return (
      <figure className="flex flex-col items-center">
        <Image
          src={imageSrc}
          alt={alt || ""}
          width={imgWidth}
          height={imgHeight}
          className="rounded-lg"
        />
        {alt && (
          <figcaption className="text-sm text-gray-500 mt-2 italic font-serif">
            {alt}
          </figcaption>
        )}
      </figure>
    );
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full border-collapse border border-gray-200 text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-gray-200 px-4 py-2 bg-gray-50 text-left font-medium text-black">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-gray-200 px-4 py-2 text-gray-700">
      {children}
    </td>
  ),
  hr: () => <hr className="border-t border-gray-200 my-8" />,
  strong: ({ children }: any) => (
    <strong className="font-semibold text-black">{children}</strong>
  ),
  em: ({ children }: any) => <em className="italic">{children}</em>,
};

function parseProps(propsString: string): Record<string, string> {
  const props: Record<string, string> = {};
  const propPattern = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = propPattern.exec(propsString)) !== null) {
    props[match[1]] = match[2];
  }

  return props;
}

function parseContentWithComponents(content: string): ReactNode[] {
  const componentPattern = /<(\w+)([^/>]*)\s*\/>/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = componentPattern.exec(content)) !== null) {
    const componentName = match[1];
    const propsString = match[2];
    const Component = customComponents[componentName];

    if (Component) {
      if (match.index > lastIndex) {
        parts.push(
          <ReactMarkdown
            key={key++}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSlug]}
            components={markdownComponents}
          >
            {content.slice(lastIndex, match.index)}
          </ReactMarkdown>
        );
      }
      const props = parseProps(propsString);
      parts.push(<Component key={key++} {...props} />);
      lastIndex = match.index + match[0].length;
    }
  }

  if (lastIndex < content.length) {
    parts.push(
      <ReactMarkdown
        key={key++}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={markdownComponents}
      >
        {content.slice(lastIndex)}
      </ReactMarkdown>
    );
  }

  return parts;
}

export function Markdown({ content }: MarkdownProps) {
  const hasCustomComponents =
    /<(\w+)([^/>]*)\s*\/>/.test(content) &&
    Object.keys(customComponents).some((name) => content.includes(`<${name}`));

  if (hasCustomComponents) {
    return (
      <div className="prose prose-lg max-w-none">
        {parseContentWithComponents(content)}
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
