"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Browser-native dictation via the Web Speech API — free, no keys.
 * Parent owns the text; this hook owns the recognition session.
 *
 * Transcript model:
 *   value     = external prefix + delivered
 *   delivered = sessionFinals + currentInterim
 * Every result event swaps `delivered` for the new cumulative string, so
 * external edits made while listening are preserved and interim growth
 * never double-inserts words.
 */

type DictationState = "idle" | "starting" | "listening" | "stopping";

type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};
type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};
type SpeechRecognitionErrorEvent = { error: string };
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (
    (w.SpeechRecognition as SpeechRecognitionConstructor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionConstructor | undefined)
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Dictation blocked — mic icon in the address bar → Allow, then reload.";
    case "audio-capture":
      return "No working microphone detected — Sound settings → Input, pick one and test it.";
    case "network":
      return "Chrome's speech engine is unreachable — check VPN/proxy/firewall.";
    case "no-speech":
      return "No speech detected.";
    case "aborted":
      return "Dictation interrupted — try again.";
    case "language-not-supported":
      return "That language is not supported for dictation.";
    default:
      return `Dictation stopped — ${code}`;
  }
}

const INSECURE_ORIGIN =
  "The mic only works on localhost or HTTPS — open http://localhost:3000.";

export function useDictation(
  value: string,
  onChange: (next: string) => void,
  { lang }: { lang?: string } = {},
) {
  const [state, setState] = useState<DictationState>("idle");

  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sessionRef = useRef(0);
  const deliveredRef = useRef("");

  const cleanup = useCallback(() => {
    deliveredRef.current = "";
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
    }
    setState("idle");
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setState("idle");
      return;
    }
    setState("stopping");
    recognition.stop();
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;

    const ctor = getCtor();
    if (!ctor) {
      toast.error("Dictation is not available in this browser.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(INSECURE_ORIGIN);
      return;
    }

    setState("starting");
    const session = ++sessionRef.current;
    deliveredRef.current = "";

    // Probe permission first to produce real errors (preflight).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      if (sessionRef.current !== session) return; // stale
      cleanup();
      const code = (error as DOMException)?.name ?? "unknown";
      toast.error(`Microphone error: ${code}`);
      return;
    }

    if (sessionRef.current !== session) {
      cleanup();
      return;
    }

    let recognition: SpeechRecognitionInstance;
    try {
      recognition = new ctor();
    } catch (error) {
      cleanup();
      toast.error(`Dictation could not start (${String((error as Error)?.name ?? "unknown")})`);
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang ?? navigator.language ?? "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sessionRef.current !== session) return;
      let cumulative = "";
      for (let index = 0; index < event.results.length; index += 1) {
        cumulative += event.results[index][0]?.transcript ?? "";
      }
      const newDelivered = cumulative;
      const prefix = stripTail(valueRef.current, deliveredRef.current);
      const next = joinText(prefix, newDelivered);
      deliveredRef.current = newDelivered;
      valueRef.current = next;
      onChangeRef.current(next);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (sessionRef.current !== session) return;
      cleanup();
      toast.error(errorMessage(event.error), {
        duration: event.error === "no-speech" ? 3000 : 8000,
      });
    };

    recognition.onend = () => {
      if (sessionRef.current !== session) return;
      cleanup();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState("listening");
    } catch (error) {
      console.error("[Dictation] start failed:", error);
      cleanup();
      toast.error("Dictation could not start.");
    }
  }, [cleanup, lang, state]);

  const toggle = useCallback(() => {
    if (state === "idle") void start();
    else stop();
  }, [state, start, stop]);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognitionRef.current = null;
        try {
          recognition.abort();
        } catch {
          /* already stopped */
        }
      }
    },
    [],
  );

  const listening = state === "listening";

  return {
    supported: typeof window !== "undefined" && getCtor() !== undefined,
    state,
    listening,
    engine: "native" as const,
    toggle,
    stop,
  };
}

function stripTail(value: string, tail: string): string {
  if (!tail) return value;
  const idx = value.lastIndexOf(tail);
  if (idx === -1) return value;
  return value.slice(0, idx);
}

function joinText(prefix: string, suffix: string): string {
  if (!prefix) return suffix;
  if (!suffix) return prefix;
  const left = prefix.replace(/\s+$/g, "");
  const right = suffix.replace(/^\s+/g, "");
  return `${left} ${right}`;
}
