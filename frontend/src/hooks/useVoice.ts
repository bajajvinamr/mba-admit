"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
}

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { lang = "en-US", continuous = false, onResult, onEnd } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

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
        const combined = final || interim;
        setTranscript(combined);
        if (final && onResult) {
          onResult(final);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        onEnd?.();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    if (hasSynth) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, [lang, continuous, onResult, onEnd]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Already started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

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
