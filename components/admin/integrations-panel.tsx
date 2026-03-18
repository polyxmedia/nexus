"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Globe, Plus, Trash2, Save, Eye, ChevronDown, ChevronRight, Zap } from "lucide-react";

export function IntegrationsPanel() {
  const [twitterStatus, setTwitterStatus] = useState<{
    connected: boolean;
    expired?: boolean;
    expiresAt?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Twitter activity log
  const [twitterPosts, setTwitterPosts] = useState<{
    id: number;
    tweetId: string;
    tweetType: string;
    content: string;
    predictionId: number | null;
    quoteTweetId: string | null;
    createdAt: string;
  }[]>([]);
  const [twitterStats, setTwitterStats] = useState<{
    total: number;
    repliesToday: number;
    byType: Record<string, number>;
  }>({ total: 0, repliesToday: 0, byType: {} });
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string>("");

  // Tweet composer
  const [composePrompt, setComposePrompt] = useState("");
  const [composeDrafts, setComposeDrafts] = useState<string[]>([]);
  const [composeGenerating, setComposeGenerating] = useState(false);
  const [composePublishing, setComposePublishing] = useState(false);
  const [composePublished, setComposePublished] = useState<{ id: string; text: string; url: string }[] | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Telegram AI settings
  const [telegramAiEnabled, setTelegramAiEnabled] = useState(true);
  const [telegramRateLimit, setTelegramRateLimit] = useState("10");
  const [telegramModel, setTelegramModel] = useState("claude-haiku-4-5-20251001");
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramSaving, setTelegramSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/twitter/oauth/status");
      if (res.ok) {
        const data = await res.json();
        setTwitterStatus(data);
      }
    } catch {
      setTwitterStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const twitterResult = params.get("twitter");
    if (twitterResult === "connected") {
      setMessage({ type: "success", text: "Twitter/X connected successfully" });
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("twitter");
      window.history.replaceState(null, "", url.toString());
    } else if (twitterResult === "denied") {
      setMessage({ type: "error", text: "Twitter/X authorization was denied" });
    } else if (twitterResult === "error") {
      setMessage({ type: "error", text: "Twitter/X connection failed" });
    }
  }, [fetchStatus]);

  const fetchTwitterActivity = useCallback(async () => {
    try {
      const params = activityFilter ? `?type=${activityFilter}` : "";
      const res = await fetch(`/api/admin/twitter-activity${params}`);
      if (res.ok) {
        const data = await res.json();
        setTwitterPosts(data.posts || []);
        setTwitterStats(data.stats || { total: 0, repliesToday: 0, byType: {} });
      }
    } catch { /* empty state is fine */ }
    finally { setActivityLoading(false); }
  }, [activityFilter]);

  useEffect(() => {
    fetchTwitterActivity();
  }, [fetchTwitterActivity]);

  const fetchTelegramSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/telegram-settings");
      if (res.ok) {
        const data = await res.json();
        setTelegramAiEnabled(data.aiEnabled ?? true);
        setTelegramRateLimit(String(data.rateLimit ?? 10));
        setTelegramModel(data.model ?? "claude-haiku-4-5-20251001");
      }
    } catch { /* defaults are fine */ }
    finally { setTelegramLoading(false); }
  }, []);

  useEffect(() => {
    fetchTelegramSettings();
  }, [fetchTelegramSettings]);

  const saveTelegramSettings = async () => {
    setTelegramSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/telegram-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabled: telegramAiEnabled,
          rateLimit: parseInt(telegramRateLimit, 10) || 10,
          model: telegramModel,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Telegram settings saved" });
      } else {
        setMessage({ type: "error", text: "Failed to save Telegram settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save Telegram settings" });
    } finally {
      setTelegramSaving(false);
    }
  };

  const connectTwitter = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/twitter/oauth");
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to start OAuth flow" });
        setConnecting(false);
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setMessage({ type: "error", text: "Failed to connect to Twitter" });
      setConnecting(false);
    }
  };

  const disconnectTwitter = async () => {
    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/twitter/oauth", { method: "DELETE" });
      if (res.ok) {
        setTwitterStatus({ connected: false });
        setMessage({ type: "success", text: "Twitter/X disconnected" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect" });
    } finally {
      setDisconnecting(false);
    }
  };

  const generateTweet = async () => {
    if (!composePrompt.trim()) return;
    setComposeGenerating(true);
    setComposeError(null);
    setComposeDrafts([]);
    setComposePublished(null);
    try {
      const res = await fetch("/api/admin/twitter-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", prompt: composePrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error || "Generation failed");
        return;
      }
      setComposeDrafts(data.tweets || []);
    } catch {
      setComposeError("Failed to generate tweet");
    } finally {
      setComposeGenerating(false);
    }
  };

  const publishTweet = async () => {
    if (composeDrafts.length === 0) return;
    setComposePublishing(true);
    setComposeError(null);
    try {
      const res = await fetch("/api/admin/twitter-compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", tweets: composeDrafts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error || "Publish failed");
        return;
      }
      setComposePublished(data.posted || []);
      setComposeDrafts([]);
      setComposePrompt("");
      fetchTwitterActivity();
    } catch {
      setComposeError("Failed to publish");
    } finally {
      setComposePublishing(false);
    }
  };

  const resetComposer = () => {
    setComposeDrafts([]);
    setComposePublished(null);
    setComposeError(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-[11px] text-navy-400">
        Platform-wide integrations. These connect to NEXUS service accounts, not individual users.
      </p>

      {message && (
        <div className={`text-[11px] font-mono px-3 py-2 rounded border ${
          message.type === "success"
            ? "text-accent-emerald border-accent-emerald/30 bg-accent-emerald/5"
            : "text-accent-rose border-accent-rose/30 bg-accent-rose/5"
        }`}>
          {message.text}
        </div>
      )}

      {/* Twitter/X Card */}
      <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-navy-800 flex items-center justify-center">
              <span className="text-sm font-bold text-navy-200">X</span>
            </div>
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
                Twitter / X
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5">
                Auto-post predictions and resolution results
              </p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-5 w-20" />
          ) : twitterStatus?.connected ? (
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${twitterStatus.expired ? "bg-accent-amber" : "bg-accent-emerald"}`} />
              <span className={`text-[10px] font-mono ${twitterStatus.expired ? "text-accent-amber" : "text-accent-emerald"}`}>
                {twitterStatus.expired ? "Token expired" : "Connected"}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-navy-500">Not connected</span>
          )}
        </div>

        <div className="text-[10px] text-navy-400 mb-4 space-y-1">
          <p>When connected, NEXUS will automatically:</p>
          <ul className="list-disc list-inside space-y-0.5 text-navy-500">
            <li>Tweet the highest-confidence prediction each cycle</li>
            <li>Post HIT/MISS results when predictions resolve</li>
            <li>Thread multiple resolutions into a summary</li>
          </ul>
        </div>

        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : twitterStatus?.connected ? (
          <div className="flex items-center gap-2">
            {(twitterStatus.expired) && (
              <Button
                variant="outline"
                size="sm"
                onClick={connectTwitter}
                disabled={connecting}
              >
                {connecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Reconnect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectTwitter}
              disabled={disconnecting}
              className="text-accent-rose border-accent-rose/30 hover:bg-accent-rose/10"
            >
              {disconnecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Disconnect
            </Button>
            {twitterStatus.expiresAt && !twitterStatus.expired && (
              <span className="text-[9px] font-mono text-navy-600">
                Expires {new Date(twitterStatus.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={connectTwitter}
            disabled={connecting}
          >
            {connecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            Connect Twitter/X
          </Button>
        )}
      </div>

      {/* Tweet Composer */}
      {twitterStatus?.connected && (
        <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
          <div className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100 mb-3">
            Compose Tweet
          </div>

          {/* Published confirmation */}
          {composePublished && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-accent-emerald" />
                <span className="text-[11px] font-mono text-accent-emerald">Published</span>
              </div>
              {composePublished.map((tweet, i) => (
                <div key={tweet.id} className="border border-accent-emerald/20 rounded p-3 bg-accent-emerald/5">
                  {composePublished.length > 1 && (
                    <span className="text-[8px] font-mono text-navy-500 mb-1 block">{i + 1}/{composePublished.length}</span>
                  )}
                  <p className="text-[11px] text-navy-200 leading-relaxed whitespace-pre-wrap mb-2">{tweet.text}</p>
                  <a
                    href={tweet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-accent-cyan hover:underline"
                  >
                    view on X
                  </a>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={resetComposer} className="mt-2">
                Compose another
              </Button>
            </div>
          )}

          {/* Draft preview */}
          {!composePublished && composeDrafts.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-mono text-navy-400 uppercase tracking-wider mb-1">Preview</div>
              {composeDrafts.map((draft, i) => (
                <div key={i} className="border border-navy-700 rounded p-3 bg-navy-900/50">
                  {composeDrafts.length > 1 && (
                    <span className="text-[8px] font-mono text-navy-500 mb-1 block">{i + 1}/{composeDrafts.length}</span>
                  )}
                  <textarea
                    value={draft}
                    onChange={(e) => {
                      const updated = [...composeDrafts];
                      updated[i] = e.target.value;
                      setComposeDrafts(updated);
                    }}
                    className="w-full bg-transparent text-[11px] text-navy-200 leading-relaxed resize-none border-none outline-none font-mono"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[9px] font-mono ${draft.length > 280 ? "text-accent-rose" : "text-navy-600"}`}>
                      {draft.length}/280
                    </span>
                  </div>
                </div>
              ))}

              {composeError && (
                <div className="text-[10px] font-mono text-accent-rose">{composeError}</div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={publishTweet}
                  disabled={composePublishing || composeDrafts.some((d) => d.length > 280)}
                  className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30 hover:bg-accent-cyan/30"
                >
                  {composePublishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                  {composeDrafts.length > 1 ? "Publish Thread" : "Publish"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => generateTweet()}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={resetComposer}>
                  <X className="h-3 w-3 mr-1" />
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Prompt input */}
          {!composePublished && composeDrafts.length === 0 && (
            <div className="space-y-3">
              <textarea
                value={composePrompt}
                onChange={(e) => setComposePrompt(e.target.value)}
                placeholder="What should the tweet be about? e.g. 'current regime state and what it means for positioning' or 'thread about our prediction accuracy this month'"
                className="w-full bg-navy-900/50 border border-navy-700/50 rounded-md px-3 py-2 text-[11px] font-mono text-navy-200 placeholder:text-navy-600 resize-none outline-none focus:border-navy-600 transition-colors"
                rows={3}
              />

              {composeError && (
                <div className="text-[10px] font-mono text-accent-rose">{composeError}</div>
              )}

              <Button
                size="sm"
                onClick={generateTweet}
                disabled={composeGenerating || !composePrompt.trim()}
                className="bg-navy-800 text-navy-200 border-navy-700 hover:bg-navy-700"
              >
                {composeGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Generate Preview
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Twitter Activity Log */}
      {twitterStatus?.connected && (
        <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
              Post Activity
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-navy-500">
                {twitterStats.repliesToday}/8 replies today
              </span>
              <button
                onClick={() => fetchTwitterActivity()}
                className="text-[9px] font-mono text-accent-cyan hover:underline"
              >
                refresh
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 mb-3">
            {["prediction", "resolution", "analyst", "reply"].map((type) => (
              <button
                key={type}
                onClick={() => setActivityFilter(activityFilter === type ? "" : type)}
                className={`text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  activityFilter === type
                    ? "bg-accent-cyan/15 text-accent-cyan"
                    : "bg-navy-800/50 text-navy-400 hover:text-navy-300"
                }`}
              >
                {type} {twitterStats.byType[type] || 0}
              </button>
            ))}
          </div>

          {/* Post list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {activityLoading ? (
              <div className="text-[10px] text-navy-500 font-mono py-4 text-center">Loading activity...</div>
            ) : twitterPosts.length === 0 ? (
              <div className="text-[10px] text-navy-500 font-mono py-4 text-center">No posts yet, activity will appear here as tweets go out</div>
            ) : (
              twitterPosts.map((post) => (
                <div key={post.id} className="border border-navy-800/50 rounded p-2.5 hover:border-navy-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      post.tweetType === "prediction" ? "bg-accent-cyan/10 text-accent-cyan"
                        : post.tweetType === "resolution" ? "bg-accent-amber/10 text-accent-amber"
                        : post.tweetType === "analyst" ? "bg-accent-emerald/10 text-accent-emerald"
                        : "bg-navy-700/50 text-navy-400"
                    }`}>
                      {post.tweetType}
                    </span>
                    {post.quoteTweetId && (
                      <span className="text-[8px] font-mono text-navy-500">quote tweet</span>
                    )}
                    <span className="text-[8px] font-mono text-navy-600 ml-auto">
                      {new Date(post.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-navy-300 leading-relaxed whitespace-pre-wrap">
                    {post.content.slice(0, 280)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`https://x.com/nexaboratorio/status/${post.tweetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] font-mono text-accent-cyan hover:underline"
                    >
                      view on X
                    </a>
                    {post.predictionId && (
                      <span className="text-[8px] font-mono text-navy-500">
                        prediction #{post.predictionId}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Telegram Bot AI Card */}
      <div className="border border-navy-700/50 rounded-lg bg-navy-900/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-navy-800 flex items-center justify-center">
              <Send className="h-4 w-4 text-accent-cyan" />
            </div>
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-navy-100">
                Telegram Bot AI
              </div>
              <p className="text-[10px] text-navy-500 mt-0.5">
                AI-powered responses to Telegram messages from linked users
              </p>
            </div>
          </div>
        </div>

        {telegramLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-navy-200 font-medium">AI Responses</div>
                <div className="text-[10px] text-navy-500">When disabled, bot only handles commands and alerts</div>
              </div>
              <button
                onClick={() => setTelegramAiEnabled(!telegramAiEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  telegramAiEnabled ? "bg-accent-emerald" : "bg-navy-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    telegramAiEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>

            {/* Model */}
            <div>
              <label className="text-[11px] text-navy-200 font-medium block mb-1">Model</label>
              <select
                value={telegramModel}
                onChange={(e) => setTelegramModel(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded px-3 py-1.5 text-xs text-navy-200 focus:outline-none focus:border-navy-500"
              >
                <option value="claude-haiku-4-5-20251001">Haiku 4.5 (cheapest)</option>
                <option value="claude-sonnet-4-20250514">Sonnet 4</option>
                <option value="claude-sonnet-4-6">Sonnet 4.6</option>
              </select>
              <p className="text-[9px] text-navy-600 mt-1">Haiku is 25x cheaper than Sonnet for short responses</p>
            </div>

            {/* Rate Limit */}
            <div>
              <label className="text-[11px] text-navy-200 font-medium block mb-1">Rate Limit (messages/hour per user)</label>
              <Input
                value={telegramRateLimit}
                onChange={(e) => setTelegramRateLimit(e.target.value)}
                type="number"
                min="1"
                max="100"
                className="w-32"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={saveTelegramSettings}
              disabled={telegramSaving}
            >
              {telegramSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save Telegram Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

