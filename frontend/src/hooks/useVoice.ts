"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type VoiceError = "not-supported" | "permission-denied" | "network" | "aborted" | "unknown";

interface UseVoiceOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: VoiceError, message: string) => void;
  /** Voice activity detection: auto-stop after N ms of silence. 0 = disabled. Default: 0 */
  vadTimeoutMs?: number;
}

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: VoiceError | null;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    lang = "en-US",
    continuous = false,
    onResult,
    onInterim,
    onEnd,
    onError,
    vadTimeoutMs = 0,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Store callbacks in refs to avoid re-creating recognition on every render
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  const clearVadTimer = useCallback(() => {
    if (vadTimerRef.current) {
      clearTimeout(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }, []);

  const resetVadTimer = useCallback(() => {
    clearVadTimer();
    if (vadTimeoutMs > 0 && recognitionRef.current) {
      vadTimerRef.current = setTimeout(() => {
        // Silence detected — stop listening
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
        }
      }, vadTimeoutMs);
    }
  }, [vadTimeoutMs, clearVadTimer, isListening]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    const hasSynth = typeof window !== "undefined" && "speechSynthesis" in window;

    setIsSupported(!!SpeechRecognition && hasSynth);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        // Update interim display
        setInterimTranscript(interim);
        if (interim) {
          onInterimRef.current?.(interim);
        }

        // Track speech activity for VAD
        if (interim || final) {
          lastSpeechTimeRef.current = Date.now();
        }

        const combined = final || interim;
        setTranscript(combined);
        if (final && onResultRef.current) {
          onResultRef.current(final);
          setInterimTranscript("");
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onspeechstart = () => {
        lastSpeechTimeRef.current = Date.now();
        clearVadTimer();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onspeechend = () => {
        // Speech ended — start VAD timer
        if (vadTimeoutMs > 0) {
          vadTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }, vadTimeoutMs);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        clearVadTimer();
        onEndRef.current?.();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        let voiceError: VoiceError = "unknown";
        let message = "Speech recognition error";

        switch (event.error) {
          case "not-allowed":
          case "service-not-allowed":
            voiceError = "permission-denied";
            message = "Microphone access denied. Please allow microphone permission in your browser settings.";
            break;
          case "network":
            voiceError = "network";
            message = "Network error during speech recognition. Please check your connection.";
            break;
          case "aborted":
            voiceError = "aborted";
            message = "Speech recognition was aborted.";
            break;
          case "no-speech":
            // Not a real error — just no speech detected, restart if continuous
            if (continuous && isListening) {
              try {
                recognition.start();
              } catch {
                // already started
              }
              return;
            }
            message = "No speech detected.";
            break;
          default:
            message = `Speech recognition error: ${event.error}`;
        }

        if (event.error !== "aborted") {
          setError(voiceError);
          onErrorRef.current?.(voiceError, message);
          console.warn("Speech recognition error:", event.error, message);
        }
        setIsListening(false);
        clearVadTimer();
      };

      recognitionRef.current = recognition;
    }

    if (hasSynth) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
      clearVadTimer();
    };
  }, [lang, continuous, vadTimeoutMs, clearVadTimer]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    try {
      recognitionRef.current.start();
      setIsListening(true);
      lastSpeechTimeRef.current = Date.now();
      // Start VAD timer from the beginning
      if (vadTimeoutMs > 0) {
        vadTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, vadTimeoutMs);
      }
    } catch {
      // Already started
    }
  }, [vadTimeoutMs]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    clearVadTimer();
  }, [clearVadTimer]);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!synthRef.current) {
          resolve();
          return;
        }

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Pick a natural-sounding voice if available
        const voices = synthRef.current.getVoices();
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Samantha") ||
              v.name.includes("Karen") ||
              v.name.includes("Daniel") ||
              v.name.includes("Google") ||
              v.name.includes("Premium"))
        );
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        synthRef.current.speak(utterance);
      });
    },
    [lang]
  );

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}

// Web Speech API type shims (not all browsers ship these in lib.dom)
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
