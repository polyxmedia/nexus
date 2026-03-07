"use client";

import { Badge } from "@/components/ui/badge";

interface WebSearchArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  language: string;
  tone: string;
}

interface WebSearchData {
  query: string;
  resultCount: number;
  articles: WebSearchArticle[];
  error?: string;
}

export function WebSearchWidget({ data }: { data: WebSearchData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const articles = (data.articles ?? []).slice(0, 10);

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Web Search
        </span>
        <Badge variant="category">{data.query}</Badge>
        <Badge className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30">
          {data.resultCount} result{data.resultCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-2">
        {articles.map((article, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-accent-cyan hover:underline leading-snug"
            >
              {article.title}
            </a>
            <div className="flex items-center gap-2 text-[10px] font-mono text-navy-500">
              <span>{article.source}</span>
              <span>{article.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
