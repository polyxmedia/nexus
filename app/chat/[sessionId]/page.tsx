"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useChat } from "@/lib/chat/useChat";
import { useVoiceMode } from "@/lib/chat/useVoiceMode";
import { MessageBlock } from "@/components/chat/MessageBlock";
import { ChatInput, type FileAttachment } from "@/components/chat/ChatInput";
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Radio,
  TrendingUp,
  Calendar,
  Swords,
  AlertTriangle,
  ArrowDown,
  Lock,
  ArrowRight,
  Zap,
  X,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { PaymentForm } from "@/components/stripe/payment-form";
import { useSubscription } from "@/lib/hooks/useSubscription";

function AutoPrompt({ sendMessage, historyLoaded, isStreaming }: { sendMessage: (msg: string) => void; historyLoaded: boolean; isStreaming: boolean }) {
  const searchParams = useSearchParams();
  const sent = useRef(false);
  const promptRef = useRef(searchParams.get("prompt") || "");
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  // Capture prompt on mount only - don't react to searchParams changes
  useEffect(() => {
    if (!promptRef.current) {
      promptRef.current = searchParams.get("prompt") || "";
    }
  }, [searchParams]);

  useEffect(() => {
    const prompt = promptRef.current;
    if (prompt && !sent.current && historyLoaded && !isStreaming) {
      sent.current = true;

      // Send first, then clear URL
      const timer = setTimeout(() => {
        sendRef.current(prompt);
        // Clear prompt from URL after sending so reload won't re-send
        const url = new URL(window.location.href);
        url.searchParams.delete("prompt");
        window.history.replaceState({}, "", url.pathname);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [historyLoaded, isStreaming]);

  return null;
}

function ChatCheckoutForm({ tierId, onClose }: { tierId: number; onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<"payment" | "setup">("payment");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setIntentType(data.type || "payment");
        }
      })
      .finally(() => setLoading(false));
  }, [tierId]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-navy-400">
            Subscribe to Analyst
          </span>
          <button
            onClick={onClose}
            className="text-navy-500 hover:text-navy-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="border border-navy-700/50 rounded-lg p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-navy-600 border-t-navy-300 rounded-full animate-spin" />
            </div>
          ) : clientSecret ? (
            <PaymentForm
              clientSecret={clientSecret}
              intentType={intentType}
              submitLabel={intentType === "setup" ? "Start free trial" : "Subscribe"}
              onSuccess={() => window.location.reload()}
              returnUrl={`${window.location.origin}/settings?tab=subscription&status=success`}
            />
          ) : (
            <p className="text-xs text-accent-rose text-center">Failed to load payment form</p>
          )}
        </div>
        <p className="mt-3 font-mono text-[9px] text-navy-600 tracking-wider text-center">
          2 days free, full access. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { turns, isStreaming, sendMessage, stop, loadHistory, upgradeRequired, creditsExhausted, setModel } = useChat(sessionId);
  const voice = useVoiceMode();
  const { isAdmin } = useSubscription();
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-6");

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    setModel(model);
  }, [setModel]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("New Chat");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [tierId, setTierId] = useState<number | null>(null);
  const userScrolledUp = useRef(false);

  // Fetch analyst tier ID for checkout
  useEffect(() => {
    if (!upgradeRequired) return;
    fetch("/api/subscription/tiers")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.tiers) return;
        const match = data.tiers.find((t: { name: string }) => {
          const n = t.name.toLowerCase();
          return n === "observer" || n === "analyst";
        });
        if (match) setTierId(match.id);
      })
      .catch((err) => console.error("[Chat] tier data fetch failed:", err));
  }, [upgradeRequired]);

  useEffect(() => {
    loadHistory().then((session) => {
      if (session) {
        setTitle(session.title);
      }
      setHistoryLoaded(true);
    });
  }, [loadHistory]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    userScrolledUp.current = false;
    setShowScrollBtn(false);
  }, []);

  // Detect when user scrolls up to override auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 100;
    userScrolledUp.current = !atBottom;
    setShowScrollBtn(!atBottom);
  }, []);

  // Auto-scroll on new content (unless user scrolled up)
  useEffect(() => {
    if (scrollRef.current && !userScrolledUp.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  // Re-enable auto-scroll when a new user message is sent
  useEffect(() => {
    if (isStreaming) {
      userScrolledUp.current = false;
    }
  }, [isStreaming]);

  // Stable refs for voice call flow
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Helper to start listening with auto-send
  const startCallListening = useCallback(() => {
    voiceRef.current.startListening((text: string) => {
      if (text.trim()) {
        sendRef.current(text);
      }
    });
  }, []);

  // Auto-speak assistant response when voice mode is on and streaming completes
  // Caps TTS to first ~800 chars for speed - full analysis is on screen
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && voiceRef.current.voiceEnabled) {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn?.role === "assistant" && lastTurn.content) {
        voiceRef.current.stopListening();
        let toSpeak = lastTurn.content;
        if (toSpeak.length > 800) {
          // Find last sentence end within ~800 chars
          const trimmed = toSpeak.slice(0, 800);
          const lastSentence = trimmed.search(/[.!?][^.!?]*$/);
          toSpeak = lastSentence > 200 ? trimmed.slice(0, lastSentence + 1) : trimmed;
        }
        voiceRef.current.speak(toSpeak);
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, turns]);

  // Voice input handler for mic button (one-shot transcription)
  const handleVoiceStart = useCallback(() => {
    startCallListening();
  }, [startCallListening]);

  // Call mode: toggle TTS + listening together
  const handleCallToggle = useCallback(() => {
    if (voice.voiceEnabled) {
      // End call
      voice.toggleVoice();
      voice.stopListening();
      voice.stopSpeaking();
    } else {
      // Start call - enable TTS and start listening
      voice.toggleVoice();
      startCallListening();
    }
  }, [voice.voiceEnabled, voice.toggleVoice, voice.stopListening, voice.stopSpeaking, startCallListening]);

  // Auto-restart listening after AI finishes speaking in call mode
  // Only triggers when isSpeaking transitions from true -> false
  const prevSpeakingRef = useRef(false);
  useEffect(() => {
    const wasSpeaking = prevSpeakingRef.current;
    prevSpeakingRef.current = voice.isSpeaking;

    // Only restart when speaking just finished (not on every render where isSpeaking=false)
    if (wasSpeaking && !voice.isSpeaking && voice.voiceEnabled && !isStreaming) {
      const timer = setTimeout(() => {
        if (voiceRef.current.voiceEnabled && !voiceRef.current.isListening && !voiceRef.current.isSpeaking) {
          startCallListening();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [voice.isSpeaking, voice.voiceEnabled, isStreaming, startCallListening]);

  return (
    <div className="ml-0 md:ml-48 flex flex-col pt-12 md:pt-0 h-[calc(100dvh-3rem)] md:h-dvh overflow-hidden">
      <Suspense fallback={null}>
        <AutoPrompt sendMessage={sendMessage} historyLoaded={historyLoaded} isStreaming={isStreaming} />
      </Suspense>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-navy-700 bg-navy-950 px-5 py-3">
        <Link
          href="/chat"
          className="text-navy-400 hover:text-navy-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-bold text-navy-200 truncate uppercase tracking-wider">
            {title}
          </div>
        </div>
      </div>

      {/* Upgrade required overlay */}
      {upgradeRequired && !showCheckout && (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center px-8 py-16">
            <Lock className="h-6 w-6 text-navy-600 mx-auto mb-4" />
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-cyan/60 mb-3">
              Observer tier
            </div>
            <h3 className="font-sans text-xl font-semibold text-navy-100 mb-2.5">
              Unlock the AI Analyst
            </h3>
            <p className="font-sans text-[13px] text-navy-500 mb-8 leading-relaxed">
              The analyst is ready to work for you. Start your free trial to get access to AI-powered intelligence, signal detection, and thesis generation.
            </p>
            <div className="text-left max-w-xs mx-auto mb-8 space-y-2.5">
              {[
                "AI analyst with memory and artifacts",
                "Signal detection across 6 intelligence layers",
                "Prediction tracking with Brier scores",
                "Daily thesis generation",
              ].map((perk) => (
                <div key={perk} className="flex items-start gap-2.5">
                  <Zap className="w-3 h-3 text-accent-cyan/40 mt-0.5 shrink-0" />
                  <span className="font-sans text-[12px] text-navy-400 leading-snug">{perk}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={!tierId}
              className="group inline-flex items-center gap-2.5 px-8 py-3 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] disabled:opacity-50"
            >
              Start free trial
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="mt-4 font-mono text-[9px] text-navy-600 tracking-wider">
              2 days free, full access. Cancel anytime.
            </p>
          </div>
        </div>
      )}

      {/* Payment form */}
      {upgradeRequired && showCheckout && tierId && (
        <ChatCheckoutForm tierId={tierId} onClose={() => setShowCheckout(false)} />
      )}

      {/* Messages */}
      {!upgradeRequired && <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {!historyLoaded ? (
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                {/* User message skeleton */}
                <div className="flex justify-end">
                  <div className="rounded-lg bg-navy-800/40 px-4 py-3 max-w-[70%] space-y-2 animate-pulse">
                    <div className="h-3 w-48 rounded bg-navy-700/50" />
                  </div>
                </div>
                {/* Assistant message skeleton */}
                <div className="flex justify-start">
                  <div className="rounded-lg bg-navy-900/60 border border-navy-700/20 px-4 py-3 max-w-[85%] space-y-2 animate-pulse">
                    <div className="h-3 w-64 rounded bg-navy-700/40" />
                    <div className="h-3 w-56 rounded bg-navy-700/40" />
                    <div className="h-3 w-40 rounded bg-navy-700/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-navy-400" />
              <div className="text-sm font-mono text-navy-300 uppercase tracking-wider">
                NEXUS Analyst Ready
              </div>
            </div>
            <div className="text-xs text-navy-500 max-w-md mb-6">
              Ask about signals, market data, game theory scenarios, the active
              thesis, predictions, or your portfolio.
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-xl">
              {[
                { label: "Active thesis summary", Icon: FileText },
                { label: "Signals firing now", Icon: Radio },
                { label: "Portfolio performance", Icon: TrendingUp },
                { label: "Hebrew calendar this week", Icon: Calendar },
                { label: "Game theory analysis", Icon: Swords },
                { label: "Highest risk trades", Icon: AlertTriangle },
              ].map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => sendMessage(prompt.label)}
                  className="flex items-center gap-1.5 rounded-full border border-navy-700/30 bg-navy-900/60 px-3 py-1.5 text-[11px] font-mono text-navy-400 hover:text-navy-100 hover:border-navy-500/40 hover:bg-navy-800/50 transition-all"
                >
                  <prompt.Icon className="h-3 w-3" />
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-6">
            {(() => {
              // Precompute last assistant index to avoid O(n^2) .slice().some() per turn
              let lastAssistantIdx = -1;
              for (let j = turns.length - 1; j >= 0; j--) {
                if (turns[j].role === "assistant" && !turns[j].pending) {
                  lastAssistantIdx = j;
                  break;
                }
              }
              return turns.map((turn, i) => {
                const cumulativeCredits = isAdmin
                  ? turns.slice(0, i + 1).reduce((sum, t) => sum + (t.tokenUsage?.creditsUsed ?? 0), 0)
                  : undefined;
                return (
                  <MessageBlock
                    key={turn.id}
                    turn={turn}
                    isStreaming={
                      isStreaming &&
                      turn.role === "assistant" &&
                      i === lastAssistantIdx
                    }
                    onSuggestionClick={sendMessage}
                    cumulativeCredits={cumulativeCredits}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>}

      {/* Credits exhausted banner — replaces input when out of credits */}
      {!upgradeRequired && creditsExhausted && (
        <div className="border-t border-navy-800/60 bg-navy-950">
          <div className="max-w-4xl mx-auto w-full px-6 py-5">
            <div className="flex items-center gap-4 rounded-lg border border-accent-amber/20 bg-accent-amber/5 px-5 py-4">
              <CreditCard className="h-5 w-5 text-accent-amber shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-navy-200 mb-0.5">
                  Credits exhausted
                </p>
                <p className="text-[12px] text-navy-500">
                  Your monthly credits have been used. Purchase more credits or wait for your next billing cycle to continue.
                </p>
              </div>
              <Link
                href="/settings?tab=subscription"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-navy-950 bg-accent-amber hover:bg-accent-amber/90 rounded-lg transition-all"
              >
                Buy credits
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Input area — pinned to bottom, max-width matched to message column */}
      {!upgradeRequired && !creditsExhausted && <div className="relative border-t border-navy-800/60 bg-navy-950">
        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 rounded-full border border-navy-600/40 bg-navy-900/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-mono text-navy-400 hover:text-navy-100 hover:border-navy-500/40 transition-all shadow-lg"
            >
              <ArrowDown className="h-3 w-3" />
              Scroll to bottom
            </button>
          </div>
        )}
        <div className="max-w-4xl mx-auto w-full">
          <ChatInput
            onSend={(msg: string, files?: FileAttachment[]) => sendMessage(msg, files)}
            onStop={stop}
            isStreaming={isStreaming}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            voiceAvailable={voice.voiceAvailable}
            voiceEnabled={voice.voiceEnabled}
            isListening={voice.isListening}
            isSpeaking={voice.isSpeaking}
            transcript={voice.transcript}
            onToggleVoice={voice.toggleVoice}
            onStartListening={handleVoiceStart}
            onStopListening={voice.stopListening}
            onStopSpeaking={voice.stopSpeaking}
            onCallToggle={handleCallToggle}
            audioStream={voice.audioStream}
          />
        </div>
      </div>}
    </div>
  );
}
