"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface VoiceState {
  voiceEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  voiceAvailable: boolean;
  transcript: string;
  audioStream: MediaStream | null;
}

export interface UseVoiceModeReturn extends VoiceState {
  toggleVoice: () => void;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

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

function playTone(freqStart: number, freqEnd: number, vol = 0.15) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.setValueAtTime(freqEnd, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {}
}

// Silence detection constants
const SILENCE_THRESHOLD = 15;      // audio level below this = silence (0-255 range)
const SPEECH_THRESHOLD = 25;       // audio level above this = speech detected
const SILENCE_DURATION_MS = 1800;  // 1.8s of silence after speech = auto-stop
const MIN_SPEECH_MS = 500;         // must speak for at least 500ms before silence detection kicks in

export function useVoiceMode(): UseVoiceModeReturn {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const voiceIdRef = useRef("onyx");
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("audio/webm");

  // Silence detection refs
  const silenceAnalyserRef = useRef<AnalyserNode | null>(null);
  const silenceCtxRef = useRef<AudioContext | null>(null);
  const silenceRafRef = useRef<number>(0);
  const speechStartedRef = useRef(false);
  const speechStartTimeRef = useRef(0);
  const lastSoundTimeRef = useRef(0);
  const autoStopEnabledRef = useRef(false);

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
    setIsSpeaking(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      console.log("[Voice] Requesting TTS, length:", toSpeak.length);
      const res = await fetch("/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: toSpeak, voiceId: voiceIdRef.current }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.text().catch(() => "");
        console.error("[Voice] TTS failed:", res.status, errData);
        setIsSpeaking(false);
        return;
      }

      const blob = await res.blob();
      console.log("[Voice] TTS audio received, size:", blob.size);
      if (blob.size < 100) {
        console.error("[Voice] TTS returned empty audio");
        setIsSpeaking(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        console.log("[Voice] TTS playback ended");
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = (e) => {
        console.error("[Voice] Audio playback error:", e);
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
      console.log("[Voice] TTS playing");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // cancelled
      } else {
        console.error("[Voice] Speak error:", err);
      }
      setIsSpeaking(false);
    }
  }, [stopSpeaking]);

  // Clean up silence detection
  const cleanupSilenceDetection = useCallback(() => {
    cancelAnimationFrame(silenceRafRef.current);
    silenceRafRef.current = 0;
    if (silenceAnalyserRef.current) {
      silenceAnalyserRef.current.disconnect();
      silenceAnalyserRef.current = null;
    }
    if (silenceCtxRef.current) {
      silenceCtxRef.current.close().catch(() => {});
      silenceCtxRef.current = null;
    }
    speechStartedRef.current = false;
    autoStopEnabledRef.current = false;
  }, []);

  const stopListening = useCallback(() => {
    cleanupSilenceDetection();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setAudioStream(null);
      }
      setIsListening(false);
      setTranscript("");
    }
    mediaRecorderRef.current = null;
  }, [cleanupSilenceDetection]);

  // Start silence detection on a stream
  const startSilenceDetection = useCallback((stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      silenceCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      silenceAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      speechStartedRef.current = false;
      speechStartTimeRef.current = 0;
      lastSoundTimeRef.current = Date.now();
      autoStopEnabledRef.current = true;

      const checkSilence = () => {
        if (!autoStopEnabledRef.current) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;

        const now = Date.now();

        if (avg > SPEECH_THRESHOLD) {
          // Speech detected
          if (!speechStartedRef.current) {
            speechStartedRef.current = true;
            speechStartTimeRef.current = now;
            console.log("[Voice] Speech detected, level:", Math.round(avg));
          }
          lastSoundTimeRef.current = now;
        }

        // Check if enough silence after speech
        if (speechStartedRef.current) {
          const speechDuration = now - speechStartTimeRef.current;
          const silenceDuration = now - lastSoundTimeRef.current;

          if (speechDuration > MIN_SPEECH_MS && avg < SILENCE_THRESHOLD && silenceDuration > SILENCE_DURATION_MS) {
            console.log("[Voice] Silence detected after speech, auto-stopping. Speech lasted:", speechDuration, "ms");
            autoStopEnabledRef.current = false;
            // Stop the recorder which triggers transcription
            const recorder = mediaRecorderRef.current;
            if (recorder && recorder.state !== "inactive") {
              playTone(1100, 880, 0.1); // descending tone to indicate auto-stop
              recorder.stop();
            }
            return;
          }
        }

        silenceRafRef.current = requestAnimationFrame(checkSilence);
      };

      silenceRafRef.current = requestAnimationFrame(checkSilence);
    } catch (err) {
      console.error("[Voice] Silence detection setup failed:", err);
    }
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (mediaRecorderRef.current) {
      stopListening();
    }

    onResultRef.current = onResult;
    chunksRef.current = [];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        setAudioStream(stream);

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/webm";
        mimeTypeRef.current = mimeType;

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          cleanupSilenceDetection();
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setAudioStream(null);
          setIsListening(false);

          console.log("[Voice] Recording stopped, chunks:", chunksRef.current.length);

          if (chunksRef.current.length === 0) {
            console.log("[Voice] No audio chunks captured");
            setTranscript("");
            return;
          }

          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];

          console.log("[Voice] Audio blob size:", audioBlob.size, "bytes");

          if (audioBlob.size < 1000) {
            console.log("[Voice] Audio too small, skipping transcription");
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
              const errText = await res.text().catch(() => "");
              console.error("[Voice] Transcription failed:", res.status, errText);
              setTranscript("");
              return;
            }

            const data = await res.json();
            const text = (data.text || "").trim();
            console.log("[Voice] Transcribed:", text);
            setTranscript("");

            if (text) {
              onResultRef.current?.(text);
            } else {
              console.log("[Voice] Empty transcription result");
            }
          } catch (err) {
            console.error("[Voice] Transcription error:", err);
            setTranscript("");
          }
        };

        recorder.onerror = () => {
          cleanupSilenceDetection();
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setAudioStream(null);
          setIsListening(false);
          setTranscript("");
        };

        // Play connect tone BEFORE recording starts so mic doesn't pick it up
        playTone(880, 1100);
        setTimeout(() => {
          if (mediaRecorderRef.current === recorder && recorder.state === "inactive") {
            recorder.start();
            setIsListening(true);
            setTranscript("Listening...");
            console.log("[Voice] Recording started, mimeType:", mimeType);

            // Start silence detection for auto-stop
            startSilenceDetection(stream);
          }
        }, 250);
      })
      .catch((err) => {
        console.error("[Voice] Mic denied:", err);
        setIsListening(false);
        setTranscript("");
      });
  }, [stopListening, startSilenceDetection, cleanupSilenceDetection]);

  useEffect(() => {
    return () => {
      cleanupSilenceDetection();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      audioRef.current?.pause();
      abortRef.current?.abort();
    };
  }, [cleanupSilenceDetection]);

  return {
    voiceEnabled,
    isListening,
    isSpeaking,
    voiceAvailable,
    transcript,
    audioStream,
    toggleVoice,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
