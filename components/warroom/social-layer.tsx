"use client";

import { useState } from "react";
import { CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { SocialPost } from "@/lib/warroom/social-intel";

interface SocialLayerProps {
  posts: SocialPost[];
}

const CATEGORY_COLORS: Record<string, string> = {
  conflict: "#ef4444",
  military: "#f43f5e",
  escalation: "#f97316",
  unrest: "#eab308",
  economy: "#06b6d4",
  politics: "#8b5cf6",
};

const SOURCE_ICONS: Record<string, string> = {
  twitter: "X",
  news: "NEWS",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SocialPopup({ post, onClose }: { post: SocialPost; onClose: () => void }) {
  const map = useMap();
  const color = CATEGORY_COLORS[post.category] || "#6b7280";

  return (
    <div
      className="absolute z-[1000] pointer-events-auto"
      style={{
        left: map.latLngToContainerPoint([post.lat, post.lng]).x - 160,
        top: map.latLngToContainerPoint([post.lat, post.lng]).y - 20,
        transform: "translateY(-100%)",
      }}
    >
      <div
        className="w-[320px] rounded-lg overflow-hidden border shadow-2xl"
        style={{
          background: "rgba(2, 6, 23, 0.95)",
          borderColor: `${color}30`,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: `${color}15` }}>
          <div className="flex items-center gap-2">
            {post.source === "twitter" && (
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" style={{ color }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-[11px] font-mono font-medium" style={{ color }}>
                  @{post.authorHandle || post.author}
                </span>
              </div>
            )}
            {post.source === "news" && (
              <span className="text-[11px] font-mono font-medium text-navy-300">
                {post.author}
              </span>
            )}
            <span className="text-[9px] font-mono text-navy-500">{timeAgo(post.timestamp)}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-navy-500 hover:text-navy-300 transition-colors p-0.5"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-3 py-2.5">
          <p className="text-[12px] text-navy-200 leading-relaxed font-sans">
            {post.text}
          </p>
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="px-3 pb-2">
            <div className="rounded-md overflow-hidden border border-navy-700/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt=""
                className="w-full h-auto max-h-[180px] object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: `${color}15` }}>
          <div className="flex items-center gap-3">
            <span
              className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color, background: `${color}15` }}
            >
              {post.category}
            </span>
            <span className="text-[8px] font-mono text-navy-600 uppercase">
              {SOURCE_ICONS[post.source] || post.source}
            </span>
          </div>
          {post.engagement && (
            <div className="flex items-center gap-2 text-[9px] font-mono text-navy-500">
              {post.engagement.likes > 0 && <span>{post.engagement.likes} likes</span>}
              {post.engagement.retweets > 0 && <span>{post.engagement.retweets} RT</span>}
            </div>
          )}
          {post.sourceUrl && (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-mono text-navy-500 hover:text-navy-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function SocialLayer({ posts }: SocialLayerProps) {
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);

  return (
    <>
      {posts.map((post) => {
        const color = CATEGORY_COLORS[post.category] || "#6b7280";
        const isTwitter = post.source === "twitter";
        const hasEngagement = post.engagement && (post.engagement.likes > 10 || post.engagement.retweets > 5);

        return (
          <CircleMarker
            key={post.id}
            center={[post.lat, post.lng]}
            radius={isTwitter ? (hasEngagement ? 5 : 3.5) : 3}
            pathOptions={{
              color: `${color}60`,
              fillColor: color,
              fillOpacity: isTwitter ? 0.9 : 0.7,
              weight: isTwitter ? 1.5 : 0.5,
              opacity: 0.8,
            }}
            eventHandlers={{
              click: () => setSelectedPost(selectedPost?.id === post.id ? null : post),
            }}
          >
            <Tooltip direction="top" className="warroom-tooltip">
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", maxWidth: "200px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                  <span style={{ color, fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    {SOURCE_ICONS[post.source]} / {post.category.toUpperCase()}
                  </span>
                  <span style={{ color: "#525252", fontSize: "8px" }}>{timeAgo(post.timestamp)}</span>
                </div>
                <div style={{ color: "#d4d4d4", fontSize: "9px", lineHeight: "1.4" }}>
                  {post.text.slice(0, 120)}{post.text.length > 120 ? "..." : ""}
                </div>
                <div style={{ color: "#737373", fontSize: "8px", marginTop: "3px" }}>
                  {isTwitter ? `@${post.authorHandle}` : post.author}
                </div>
                <div style={{ color: "#525252", fontSize: "7px", marginTop: "2px" }}>
                  Click for detail
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {selectedPost && (
        <SocialPopup post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  );
}
