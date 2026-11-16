"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { blobToPcm16k, transcribePcm } from "./whisper";

/**
 * Dictation with automatic engine fallback.
 *
 * Native (Web Speech) is tried first — fast, live transcript. If Chrome or
 * the OS blocks it (permission denied, no capture device, engine unreachable)
 * the hook permanently switches to the offline Whisper engine:
 * MediaRecorder → transformers.js (in-browser ASR). No keys, no network,
 * no Google. First Whisper use downloads the model (~40 MB) and caches it.
 */

type DictationState = "idle" | "starting" | "listening" | "stopping";
type Engine = "native" | "whisper";

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

function nativeErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Chrome blocked the mic (native engine) — switching to offline mode.";
    case "network":
      return "Chrome's speech engine is unreachable — switching to offline mode.";
    case "audio-capture":
      return "Chrome can't find an audio device — switching to offline mode.";
    case "no-speech":
      return "No speech detected.";
    case "aborted":
      return "Dictation interrupted — try again.";
    case "language-not-supported":
      return "That language is not supported for dictation.";
    default:
      return `Dictation stopped — Chrome error: ${code}`;
  }
}

export function useDictation(
  value: string,
  onChange: (next: string) => void,
  { lang }: { lang?: string } = {},
) {
  const [state, setState] = useState<DictationState>("idle");
  const [engine, setEngine] = useState<Engine>("native");

  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef(0);
  const deliveredRef = useRef("");
  const engineRef = useRef<Engine>("native");
  const failuresRef = useRef(0);

  const cleanup = useCallback(() => {
    deliveredRef.current = "";

    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
      }
      recorderRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    chunksRef.current = [];

    setState("idle");
  }, []);

  // ---- Offline Whisper engine -------------------------------------------

  const startWhisper = useCallback(async () => {
    const session = ++sessionRef.current;
    deliveredRef.current = "";
    setState("starting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (sessionRef.current !== session) return; // stale
      cleanup();
      const code = (error as DOMException)?.name ?? "unknown";
      toast.error(
        code === "NotAllowedError"
          ? "Microphone access denied — allow the mic in Windows Settings → Privacy & security → Microphone, then reload."
          : `Could not open the microphone (${code}).`,
        { duration: 8000 },
      );
      return;
    }

    if (sessionRef.current !== session) {
      stream.getTracks().forEach((track) => track.stop());
      cleanup();
      return;
    }

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      chunksRef.current = [];
      recorderRef.current = null;

      void (async () => {
        try {
          const pcm = await blobToPcm16k(blob);
          const text = (await transcribePcm(pcm)).trim();
          if (!text) {
            toast.message("No speech detected in the recording.");
            cleanup();
            return;
          }
          const base = valueRef.current.trimEnd();
          const next = base ? `${base} ${text}` : text;
          valueRef.current = next;
          onChangeRef.current(next);
        } catch (error) {
          console.error("[Dictation whisper] transcription failed:", error);
          toast.error(
            "Offline transcription failed — download size may be a problem, or the model couldn't load.",
            { duration: 8000 },
          );
        } finally {
          cleanup();
        }
      })();
    };

    recorderRef.current = recorder;
    setState("listening");
    recorder.start(250); // collect chunks every 250 ms
  }, [cleanup]);

  // ---- Native Web Speech engine -----------------------------------------

  const startNative = useCallback(async () => {
    const ctor = getCtor();
    if (!ctor) {
      engineRef.current = "whisper";
      setEngine("whisper");
      await startWhisper();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(
        "The mic only works on localhost or HTTPS — open http://localhost:3000, not a LAN/IP address.",
      );
      return;
    }

    const session = ++sessionRef.current;
    deliveredRef.current = "";
    setState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      if (sessionRef.current !== session) return;
      failuresRef.current += 1;
      engineRef.current = "whisper";
      setEngine("whisper");
      console.error("[Dictation native] getUserMedia failed:", error);
      toast.error("Mic got zeroed out at the OS level — switching to offline mode.", {
        duration: 8000,
      });
      await startWhisper();
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
      console.error("[Dictation native] constructor failed:", error);
      engineRef.current = "whisper";
      setEngine("whisper");
      cleanup();
      await startWhisper();
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
      const code = event.error;
      console.error("[Dictation native] error:", code);
      failuresRef.current += 1;
      cleanup();

      if (
        code === "not-allowed" ||
        code === "service-not-allowed" ||
        code === "network" ||
        code === "audio-capture" ||
        code === "language-not-supported"
      ) {
        engineRef.current = "whisper";
        setEngine("whisper");
        return;
      }
      toast.error(nativeErrorMessage(code), { duration: code === "no-speech" ? 4000 : 8000 });
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
      console.error("[Dictation native] start failed:", error);
      recognitionRef.current = null;
      engineRef.current = "whisper";
      setEngine("whisper");
      await startWhisper();
    }
  }, [cleanup, lang, startWhisper]);

  // ---- Public API ---------------------------------------------------------

  const start = useCallback(async () => {
    if (state !== "idle") return;
    if (engineRef.current === "whisper") return startWhisper();
    return startNative();
  }, [state, startNative, startWhisper]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    const recorder = recorderRef.current;
    if (recognition) {
      setState("stopping");
      recognition.stop();
      return;
    }
    if (recorder && recorder.state !== "inactive") {
      setState("stopping");
      recorder.stop();
      return;
    }
    setState("idle");
  }, []);

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
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            /* ignore */
          }
        }
        recorderRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [],
  );

  const listening = state === "listening";

  return {
    supported: typeof window !== "undefined",
    state,
    listening,
    engine,
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
