"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, RefreshCw, Globe, CheckCircle2, XCircle } from "lucide-react";

export function OGTesterPanel() {
  const [url, setUrl] = useState("");
  const [ogData, setOgData] = useState<{
    ogImage: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogUrl: string | null;
    twitterCard: string | null;
    twitterImage: string | null;
    allMeta: { property: string; content: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const defaultUrl = baseUrl || "https://nexushq.xyz";

  const testOG = async (testUrl?: string) => {
    const target = testUrl || url || defaultUrl;
    setLoading(true);
    setError(null);
    setOgData(null);
    setDirectUrl(null);

    try {
      // Fetch the page HTML and parse OG tags
      const res = await fetch(`/api/admin/og-test?url=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setOgData(data);

      // Also set the direct OG image URL for preview
      if (data.ogImage) {
        // If it's a relative URL, make it absolute
        const imgUrl = data.ogImage.startsWith("http")
          ? data.ogImage
          : new URL(data.ogImage, target).toString();
        setDirectUrl(imgUrl);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testDirect = () => {
    // Directly render the OG image endpoint
    const target = url || defaultUrl;
    try {
      const parsed = new URL(target.startsWith("http") ? target : `https://${target}`);
      setDirectUrl(`${parsed.origin}/opengraph-image`);
      setOgData(null);
      setError(null);
    } catch {
      setDirectUrl(`${defaultUrl}/opengraph-image`);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-[11px] text-navy-400">
        Test how your OG image and meta tags appear when shared on social platforms.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder={defaultUrl}
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          className="flex-1 min-w-[280px] text-xs"
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") testOG(); }}
        />
        <Button variant="outline" size="sm" onClick={() => testOG()} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
          Test URL
        </Button>
        <Button variant="outline" size="sm" onClick={testDirect}>
          <Eye className="h-3 w-3 mr-1" />
          Direct Image
        </Button>
      </div>

      {/* Quick test buttons */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "Homepage", path: "/" },
          { label: "Research FAQ", path: "/research/faq" },
          { label: "Privacy", path: "/privacy" },
          { label: "Security", path: "/security" },
        ].map(({ label, path }) => (
          <button
            key={path}
            onClick={() => { setUrl(`${defaultUrl}${path}`); testOG(`${defaultUrl}${path}`); }}
            className="text-[10px] font-mono text-navy-500 bg-navy-800/50 px-2 py-1 rounded hover:bg-navy-700/50 hover:text-navy-300 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
          {error}
        </div>
      )}

      {/* OG Image Preview */}
      {directUrl && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">OG Image Preview</div>
          <div className="border border-navy-700 rounded-lg overflow-hidden bg-navy-900/50">
            <img
              src={`${directUrl}?t=${Date.now()}`}
              alt="OG Image Preview"
              className="w-full"
              style={{ aspectRatio: "1200/630" }}
              onError={() => setError("Failed to load OG image")}
            />
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-navy-500 bg-navy-800/50 px-2 py-1 rounded flex-1 overflow-x-auto">
              {directUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(directUrl)}
              className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Parsed Meta Tags */}
      {ogData && (
        <div className="space-y-3">
          {/* Social Preview Card */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Social Preview</div>
          <div className="border border-navy-700 rounded-lg overflow-hidden bg-navy-900/50 max-w-lg">
            {directUrl && (
              <img
                src={`${directUrl}?t=${Date.now()}`}
                alt="OG Preview"
                className="w-full"
                style={{ aspectRatio: "1200/630" }}
              />
            )}
            <div className="px-3 py-2.5">
              <div className="text-[10px] font-mono text-navy-500 uppercase">
                {ogData.ogUrl ? new URL(ogData.ogUrl).hostname : ""}
              </div>
              <div className="text-sm font-semibold text-navy-100 mt-0.5">
                {ogData.ogTitle || "No og:title found"}
              </div>
              <div className="text-xs text-navy-400 mt-0.5 line-clamp-2">
                {ogData.ogDescription || "No og:description found"}
              </div>
            </div>
          </div>

          {/* Raw Meta Tags Table */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">All OG/Twitter Meta Tags</div>
          <div className="border border-navy-700 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500">Property</th>
                  <th className="text-left px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-500">Content</th>
                </tr>
              </thead>
              <tbody>
                {ogData.allMeta.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-navy-600 italic">No OG or Twitter meta tags found</td>
                  </tr>
                ) : (
                  ogData.allMeta.map((m, i) => (
                    <tr key={i} className="border-b border-navy-800/50">
                      <td className="px-3 py-1.5 font-mono text-accent-cyan/70 whitespace-nowrap">{m.property}</td>
                      <td className="px-3 py-1.5 text-navy-300 break-all">{m.content}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Validation */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Validation</div>
          <div className="space-y-1">
            {[
              { label: "og:title", ok: !!ogData.ogTitle },
              { label: "og:description", ok: !!ogData.ogDescription },
              { label: "og:image", ok: !!ogData.ogImage },
              { label: "og:url", ok: !!ogData.ogUrl },
              { label: "twitter:card", ok: !!ogData.twitterCard },
              { label: "twitter:image", ok: !!ogData.twitterImage },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                {ok ? (
                  <CheckCircle2 className="h-3 w-3 text-accent-emerald" />
                ) : (
                  <XCircle className="h-3 w-3 text-accent-rose" />
                )}
                <span className={ok ? "text-navy-300" : "text-accent-rose"}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

