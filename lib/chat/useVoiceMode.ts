"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface VoiceState {
  voiceEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  voiceAvailable: boolean;
  transcript: string;
}

export interface UseVoiceModeReturn extends VoiceState {
  toggleVoice: () => void;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

// Strip markdown for cleaner TTS
function cleanForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/`[^`]+`/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function useVoiceMode(): UseVoiceModeReturn {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const voiceIdRef = useRef("onyx");
  const streamRef = useRef<MediaStream | null>(null);

  // Check tier + load voice setting on mount
  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        const tierName = (data.tier?.name || "free").toLowerCase();
        const isHighTier = ["operator", "institution"].includes(tierName);
        const isAdmin = data.isAdmin === true;
        setVoiceAvailable(isHighTier || isAdmin);
      })
      .catch(() => setVoiceAvailable(false));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = Array.isArray(data) ? data : data.settings || [];
        const voiceSetting = s.find((x: { key: string }) => x.key === "voice_id");
        if (voiceSetting?.value) voiceIdRef.current = voiceSetting.value;
      })
      .catch(() => {});
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) {
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

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsListening(false);
    setTranscript("");
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    // Stop any existing recording
    if (mediaRecorderRef.current) {
      stopListening();
    }

    onResultRef.current = onResult;
    chunksRef.current = [];

    setTranscript("Requesting microphone...");

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;

        // Pick a supported mime type
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/webm";

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          // Stop all mic tracks
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          if (chunksRef.current.length === 0) {
            setIsListening(false);
            setTranscript("");
            return;
          }

          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];

          // Skip very short recordings (< 0.5s of audio, roughly < 8KB)
          if (audioBlob.size < 8000) {
            setIsListening(false);
            setTranscript("");
            return;
          }

          setTranscript("Transcribing...");

          try {
            const ext = mimeType.includes("mp4") ? "mp4" : "webm";
            const formData = new FormData();
            formData.append("audio", audioBlob, `recording.${ext}`);

            const res = await fetch("/api/chat/transcribe", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: "Transcription failed" }));
              console.error("[Voice] Transcription error:", err);
              setTranscript("");
              setIsListening(false);
              return;
            }

            const data = await res.json();
            const text = (data.text || "").trim();

            setTranscript("");
            setIsListening(false);

            if (text) {
              onResultRef.current?.(text);
            }
          } catch (err) {
            console.error("[Voice] Transcription error:", err);
            setTranscript("");
            setIsListening(false);
          }
        };

        recorder.onerror = () => {
          console.error("[Voice] MediaRecorder error");
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setIsListening(false);
          setTranscript("");
        };

        recorder.start();
        setIsListening(true);
        setTranscript("Listening...");
      })
      .catch((err) => {
        console.error("[Voice] Microphone access denied:", err);
        setIsListening(false);
        setTranscript("");
      });
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
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
