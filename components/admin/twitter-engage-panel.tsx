"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  Search,
  Send,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface Tweet {
  id: string;
  text: string;
  authorUsername: string;
  authorId: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

interface TweetCardState {
  generating: boolean;
  generatedReply: string | null;
  posting: boolean;
  posted: { id: string; url: string } | null;
  error: string | null;
  copied: boolean;
}

const SUGGESTED_QUERIES = [
  "geopolitical risk markets",
  "OSINT intelligence",
  "prediction market accuracy",
  "systemic risk financial",
  "sanctions tariffs impact",
  "oil price geopolitics",
  "VIX signal warning",
  "regime shift market",
  "Middle East risk shipping",
  "AI trading intelligence",
  "building in public AI",
  "startup founder SaaS",
];

export function TwitterEngagePanel() {
  const [query, setQuery] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, TweetCardState>>({});

  const updateCardState = useCallback((tweetId: string, update: Partial<TweetCardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [tweetId]: { ...getCardState(prev, tweetId), ...update },
    }));
  }, []);

  const searchTweets = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(null);
    setTweets([]);
    setCardStates({});

    try {
      const res = await fetch(`/api/admin/twitter-engage?q=${encodeURIComponent(q.trim())}&max=20`);
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
      } else {
        setTweets(data.tweets || []);
      }
    } catch {
      setSearchError("Search failed");
    }
    setSearching(false);
  }, []);

  const generateReply = useCallback(async (tweet: Tweet) => {
    updateCardState(tweet.id, { generating: true, error: null, generatedReply: null });

    try {
      const res = await fetch("/api/admin/twitter-engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          tweetId: tweet.id,
          tweetText: tweet.text,
          authorUsername: tweet.authorUsername,
        }),
      });
      const data = await res.json();
      if (data.error) {
        updateCardState(tweet.id, { generating: false, error: data.error });
      } else if (data.reply) {
        updateCardState(tweet.id, { generating: false, generatedReply: data.reply });
      } else {
        updateCardState(tweet.id, { generating: false, error: data.reason || "AI couldn't generate a valuable reply for this tweet" });
      }
    } catch {
      updateCardState(tweet.id, { generating: false, error: "Generation failed" });
    }
  }, [updateCardState]);

  const postReply = useCallback(async (tweet: Tweet, replyText: string) => {
    updateCardState(tweet.id, { posting: true, error: null });

    try {
      const res = await fetch("/api/admin/twitter-engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post",
          tweetId: tweet.id,
          replyText,
        }),
      });
      const data = await res.json();
      if (data.error) {
        updateCardState(tweet.id, { posting: false, error: data.error });
      } else {
        updateCardState(tweet.id, {
          posting: false,
          posted: { id: data.posted.id, url: data.posted.url },
        });
      }
    } catch {
      updateCardState(tweet.id, { posting: false, error: "Post failed" });
    }
  }, [updateCardState]);

  const copyReply = useCallback((tweetId: string, text: string) => {
    navigator.clipboard.writeText(text);
    updateCardState(tweetId, { copied: true });
    setTimeout(() => updateCardState(tweetId, { copied: false }), 2000);
  }, [updateCardState]);

  return (
    <div className="max-w-4xl">
      <p className="text-[11px] text-navy-400 mb-6">
        Search X for relevant conversations, generate replies using your voice and NEXUS intelligence, then post directly.
      </p>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchTweets(query); }}
            placeholder="Search tweets... e.g. geopolitical risk markets"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-navy-900/50 border border-navy-700/50 text-xs font-mono text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-500 transition-colors"
          />
        </div>
        <Button
          size="sm"
          onClick={() => searchTweets(query)}
          disabled={searching || !query.trim()}
        >
          {searching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
          Search
        </Button>
      </div>

      {/* Suggested queries */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {SUGGESTED_QUERIES.map((sq) => (
          <button
            key={sq}
            onClick={() => { setQuery(sq); searchTweets(sq); }}
            className="text-[9px] font-mono text-navy-500 bg-navy-800/40 hover:bg-navy-800/70 hover:text-navy-300 rounded px-2 py-1 transition-colors"
          >
            {sq}
          </button>
        ))}
      </div>

      {searchError && (
        <div className="border border-accent-rose/20 rounded-lg bg-accent-rose/[0.04] p-4 mb-4">
          <p className="text-[11px] text-accent-rose">{searchError}</p>
        </div>
      )}

      {/* Results */}
      {tweets.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-navy-500 uppercase tracking-widest">
            {tweets.length} tweets found
          </span>
          <span className="text-[10px] font-mono text-navy-600">
            sorted by engagement
          </span>
        </div>
      )}

      <div className="space-y-3">
        {tweets
          .sort((a, b) => {
            const engA = a.metrics.likes + a.metrics.retweets * 2 + a.metrics.replies;
            const engB = b.metrics.likes + b.metrics.retweets * 2 + b.metrics.replies;
            return engB - engA;
          })
          .map((tweet) => {
            const state = getCardState(cardStates, tweet.id);
            const engagement = tweet.metrics.likes + tweet.metrics.retweets + tweet.metrics.replies;

            return (
              <div
                key={tweet.id}
                className="border border-navy-700/40 rounded-lg bg-navy-900/30 overflow-hidden"
              >
                {/* Tweet */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <a
                        href={`https://x.com/${tweet.authorUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-accent-cyan hover:underline shrink-0"
                      >
                        @{tweet.authorUsername}
                      </a>
                      <span className="text-[10px] text-navy-600 font-mono">
                        {formatTimeAgo(tweet.createdAt)}
                      </span>
                    </div>
                    <a
                      href={`https://x.com/${tweet.authorUsername}/status/${tweet.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy-600 hover:text-navy-400 transition-colors shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <p className="text-[12px] text-navy-300 leading-relaxed mb-3">
                    {tweet.text}
                  </p>

                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[10px] text-navy-600 font-mono">
                      <Heart className="h-3 w-3" /> {tweet.metrics.likes}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-navy-600 font-mono">
                      <Repeat2 className="h-3 w-3" /> {tweet.metrics.retweets}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-navy-600 font-mono">
                      <MessageCircle className="h-3 w-3" /> {tweet.metrics.replies}
                    </span>
                    {engagement >= 20 && (
                      <span className="text-[9px] font-mono text-accent-amber bg-accent-amber/[0.08] rounded px-1.5 py-0.5">
                        HIGH REACH
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions / Generated Reply */}
                <div className="border-t border-navy-800/40 px-4 py-3 bg-navy-950/30">
                  {state.posted ? (
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent-emerald" />
                      <span className="text-[11px] text-accent-emerald font-mono">Posted</span>
                      <a
                        href={state.posted.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-accent-cyan hover:underline font-mono ml-auto"
                      >
                        View on X
                      </a>
                    </div>
                  ) : state.generatedReply ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider block mb-1.5">
                          Generated Reply
                        </span>
                        <textarea
                          value={state.generatedReply}
                          onChange={(e) => updateCardState(tweet.id, { generatedReply: e.target.value })}
                          rows={3}
                          className="w-full bg-navy-900/60 border border-navy-700/40 rounded px-3 py-2 text-[12px] text-navy-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-navy-500"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-[9px] font-mono ${(state.generatedReply?.length || 0) > 280 ? "text-accent-rose" : "text-navy-600"}`}>
                            {state.generatedReply?.length || 0}/280
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => postReply(tweet, state.generatedReply!)}
                          disabled={state.posting || !state.generatedReply || state.generatedReply.length > 280}
                        >
                          {state.posting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                          Post Reply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyReply(tweet.id, state.generatedReply!)}
                        >
                          {state.copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {state.copied ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateReply(tweet)}
                          disabled={state.generating}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => generateReply(tweet)}
                        disabled={state.generating}
                      >
                        {state.generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        {state.generating ? "Generating..." : "Generate Reply"}
                      </Button>
                      {state.error && (
                        <span className="text-[10px] text-accent-rose font-mono">{state.error}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {searching && (
        <div className="flex items-center justify-center gap-2 py-12 text-navy-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-mono">Searching X...</span>
        </div>
      )}

      {!searching && tweets.length === 0 && query && !searchError && (
        <div className="text-center py-12">
          <Search className="h-6 w-6 text-navy-700 mx-auto mb-3" />
          <p className="text-xs text-navy-500">No results. Try a different query.</p>
        </div>
      )}
    </div>
  );
}

function getCardState(states: Record<string, TweetCardState>, tweetId: string): TweetCardState {
  return states[tweetId] || {
    generating: false,
    generatedReply: null,
    posting: false,
    posted: null,
    error: null,
    copied: false,
  };
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
