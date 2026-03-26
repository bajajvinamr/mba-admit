import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="font-sans font-semibold text-4xl md:text-5xl mb-6 mt-12 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-sans font-semibold text-2xl md:text-3xl mb-4 mt-10">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-sans font-semibold text-xl mb-3 mt-8">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-charcoal/70 leading-relaxed mb-4">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-6 mb-6 space-y-2 text-charcoal/70">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 text-charcoal/70">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    a: ({ href, children }) => (
      <Link href={href || "#"} className="text-primary hover:underline font-medium">
        {children}
      </Link>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary pl-6 italic text-charcoal/50 my-6">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="text-left text-[10px] uppercase tracking-widest text-charcoal/40 font-bold p-3 border-b border-jet/10">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="p-3 border-b border-jet/5 text-charcoal/70">{children}</td>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-jet">{children}</strong>
    ),
    hr: () => <hr className="border-jet/10 my-10" />,
    ...components,
  };
}
