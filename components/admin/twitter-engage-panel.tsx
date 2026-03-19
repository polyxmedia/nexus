"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Send,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Link2,
  Plus,
  X,
} from "lucide-react";

interface Tweet {
  id: string;
  text: string;
  authorUsername: string;
  url: string;
}

interface TweetCardState {
  generating: boolean;
  generatedReply: string | null;
  posting: boolean;
  posted: { id: string; url: string } | null;
  error: string | null;
  copied: boolean;
}

function parseTweetUrl(input: string): { username: string; id: string } | null {
  const trimmed = input.trim();
  // Match x.com or twitter.com status URLs
  const match = trimmed.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/);
  if (match) return { username: match[1], id: match[2] };
  return null;
}

export function TwitterEngagePanel() {
  const [urlInput, setUrlInput] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, TweetCardState>>({});

  const updateCardState = useCallback((tweetId: string, update: Partial<TweetCardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [tweetId]: { ...getCardState(prev, tweetId), ...update },
    }));
  }, []);

  const addTweet = useCallback(async () => {
    const parsed = parseTweetUrl(urlInput);
    if (!parsed) {
      setInputError("Paste a valid X/Twitter URL, e.g. https://x.com/user/status/123456");
      return;
    }

    // Check for duplicate
    if (tweets.some((t) => t.id === parsed.id)) {
      setInputError("Tweet already added");
      return;
    }

    setLoading(true);
    setInputError(null);

    try {
      // Use Twitter's free oembed endpoint to get tweet text
      const oembedUrl = `https://publish.twitter.com/oembed?url=https://twitter.com/${parsed.username}/status/${parsed.id}&omit_script=true`;
      const res = await fetch(`/api/admin/twitter-engage/oembed?url=${encodeURIComponent(oembedUrl)}`);
      const data = await res.json();

      if (data.error) {
        setInputError(data.error);
        setLoading(false);
        return;
      }

      setTweets((prev) => [
        {
          id: parsed.id,
          text: data.text,
          authorUsername: data.authorUsername || parsed.username,
          url: `https://x.com/${parsed.username}/status/${parsed.id}`,
        },
        ...prev,
      ]);
      setUrlInput("");
    } catch {
      setInputError("Failed to fetch tweet");
    }
    setLoading(false);
  }, [urlInput, tweets]);

  const removeTweet = useCallback((id: string) => {
    setTweets((prev) => prev.filter((t) => t.id !== id));
    setCardStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
        Paste tweet URLs to generate and post replies using your voice and NEXUS intelligence. Browse X normally, find conversations worth engaging, paste the link here.
      </p>

      {/* URL input */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-600" />
          <input
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setInputError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") addTweet(); }}
            placeholder="https://x.com/username/status/123456789"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-navy-900/50 border border-navy-700/50 text-xs font-mono text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-500 transition-colors"
          />
        </div>
        <Button
          size="sm"
          onClick={addTweet}
          disabled={loading || !urlInput.trim()}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          Add Tweet
        </Button>
      </div>

      {inputError && (
        <p className="text-[10px] text-accent-rose font-mono mb-4">{inputError}</p>
      )}

      {/* Tweet cards */}
      {tweets.length > 0 && (
        <div className="mb-3 mt-6">
          <span className="text-[10px] font-mono text-navy-500 uppercase tracking-widest">
            {tweets.length} tweet{tweets.length !== 1 ? "s" : ""} queued
          </span>
        </div>
      )}

      <div className="space-y-3">
        {tweets.map((tweet) => {
          const state = getCardState(cardStates, tweet.id);

          return (
            <div
              key={tweet.id}
              className="border border-navy-700/40 rounded-lg bg-navy-900/30 overflow-hidden"
            >
              {/* Tweet */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <a
                    href={`https://x.com/${tweet.authorUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-accent-cyan hover:underline shrink-0"
                  >
                    @{tweet.authorUsername}
                  </a>
                  <div className="flex items-center gap-2">
                    <a
                      href={tweet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy-600 hover:text-navy-400 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => removeTweet(tweet.id)}
                      className="text-navy-600 hover:text-accent-rose transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[12px] text-navy-300 leading-relaxed">
                  {tweet.text}
                </p>
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
                    {state.error && (
                      <span className="text-[10px] text-accent-rose font-mono">{state.error}</span>
                    )}
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

      {tweets.length === 0 && (
        <div className="text-center py-12">
          <Link2 className="h-6 w-6 text-navy-700 mx-auto mb-3" />
          <p className="text-xs text-navy-500">Paste a tweet URL above to get started.</p>
          <p className="text-[10px] text-navy-600 mt-1">Search requires Twitter API Basic tier ($100/mo). URL mode is free.</p>
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
