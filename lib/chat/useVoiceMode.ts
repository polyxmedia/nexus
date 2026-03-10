"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API types (not in all TS libs)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface VoiceState {
  /** Whether voice mode is enabled (TTS auto-play) */
  voiceEnabled: boolean;
  /** Whether mic is actively recording */
  isListening: boolean;
  /** Whether TTS audio is currently playing */
  isSpeaking: boolean;
  /** Whether the user's tier supports voice */
  voiceAvailable: boolean;
  /** Interim transcript while speaking */
  transcript: string;
}

interface UseVoiceModeReturn extends VoiceState {
  toggleVoice: () => void;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

// Strip markdown/special chars for cleaner TTS
function cleanForTTS(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    // Remove inline code
    .replace(/`[^`]+`/g, "")
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove markdown links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove bullet points
    .replace(/^[-*]\s+/gm, "")
    // Remove numbered list markers
    .replace(/^\d+\.\s+/gm, "")
    // Collapse whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Check for SpeechRecognition support
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceMode(): UseVoiceModeReturn {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const voiceIdRef = useRef("pNInz6obpgDQGcFmaJgB");

  // Check tier + load voice setting on mount
  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        // Admin or tier level >= operator
        const tierName = (data.tier?.name || "free").toLowerCase();
        const isHighTier = ["operator", "institution"].includes(tierName);
        const isAdmin = data.isAdmin === true;
        setVoiceAvailable(isHighTier || isAdmin);
      })
      .catch(() => setVoiceAvailable(false));

    // Load voice_id setting
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = Array.isArray(data) ? data : data.settings || [];
        const voiceSetting = s.find((x: { key: string }) => x.key === "voice_id");
        if (voiceSetting?.value) voiceIdRef.current = voiceSetting.value;
      })
      .catch((err) => console.error("[VoiceMode] fetch voice settings failed:", err));
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) {
        // Turning off - stop any playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    const cleaned = cleanForTTS(text);
    if (!cleaned || cleaned.length < 3) return;

    // Truncate very long responses
    const toSpeak = cleaned.length > 4000 ? cleaned.slice(0, 4000) + "..." : cleaned;

    stopSpeaking();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSpeaking(true);

    try {
      const res = await fetch("/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: toSpeak, voiceId: voiceIdRef.current }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error("[Voice] TTS failed:", res.status);
        setIsSpeaking(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled
      } else {
        console.error("[Voice] Playback error:", err);
      }
      setIsSpeaking(false);
    }
  }, [stopSpeaking]);

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      console.warn("[Voice] SpeechRecognition not supported");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    onResultRef.current = onResult;
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        onResultRef.current?.(finalTranscript.trim());
        setTranscript("");
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.error("[Voice] Recognition error:", event.error);
      }
      setIsListening(false);
      setTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      audioRef.current?.pause();
      abortRef.current?.abort();
    };
  }, []);

  return {
    voiceEnabled,
    isListening,
    isSpeaking,
    voiceAvailable,
    transcript,
    toggleVoice,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
