"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Browser-native dictation via the Web Speech API — no keys, no cost.
 * Not available in Firefox; renders nothing there.
 *
 * The hook owns the lifecycle; the parent owns the text state. Each result
 * event rebuilds the full text from `baseRef + session transcript`, so
 * interim results never double-append words.
 */

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
type SpeechRecognitionEvent = { results: SpeechRecognitionResultList };
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
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const ctor: SpeechRecognitionConstructor | undefined =
  typeof window !== "undefined"
    ? ((window as unknown as Record<string, unknown>)
        .SpeechRecognition as SpeechRecognitionConstructor | undefined) ??
      ((window as unknown as Record<string, unknown>)
        .webkitSpeechRecognition as SpeechRecognitionConstructor | undefined)
    : undefined;

export function useDictation(
  value: string,
  onChange: (next: string) => void,
) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseRef = useRef("");
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    if (!ctor || recognitionRef.current) return;

    // 1) Not a secure context at all (plain-HTTP LAN IP, no mic API ever).
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(
        "The mic only works on localhost or HTTPS — open http://localhost:3000, not a LAN/IP address.",
        { duration: 8000 },
      );
      return;
    }

    // 2) Chrome reports the permission state directly when it knows it.
    let state: string | undefined;
    try {
      const status = await navigator.permissions?.query({
        name: "microphone" as unknown as PermissionName,
      });
      state = status?.state;
    } catch {
      state = undefined;
    }

    if (state === "denied") {
      toast.error(
        "Mic is blocked for this site — click the mic icon in the address bar → Allow, then reload.",
        { duration: 8000 },
      );
      return;
    }

    // 3) Prompt-or-allow path — probe. On Windows, system mic privacy can
    // still refuse us with no browser prompt at all.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      toast.error(
        "Windows is refusing the mic before Chrome can ask — check Windows Settings → Privacy & security → Microphone → allow microphone and desktop apps, then reload.",
        { duration: 8000 },
      );
      return;
    }

    const recognition = new ctor();
    baseRef.current = valueRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let sessionText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        sessionText += result[0]?.transcript ?? "";
      }
      const base = baseRef.current.trimEnd();
      const next = sessionText.trimStart();
      onChange(base ? `${base} ${next}` : next);
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        toast.error(
          "Chrome blocked the mic — mic icon in the address bar → Allow, or check localhost vs LAN address and Windows mic privacy, then reload.",
          { duration: 8000 },
        );
      } else if (event.error === "audio-capture") {
        toast.error(
          "Chrome can't find a working microphone — Windows Sound settings → Input → pick a real device and test it there first.",
          { duration: 8000 },
        );
      } else if (event.error === "network") {
        toast.error(
          "Chrome's speech engine is unreachable — check VPN/proxy/firewall (it streams audio to Google to transcribe).",
          { duration: 8000 },
        );
      } else if (event.error === "no-speech") {
        toast.message("No speech detected.");
      } else {
        toast.error(`Dictation stopped — Chrome error: ${event.error}`, {
          duration: 8000,
        });
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [onChange]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Stop dictation if the surrounding component unmounts mid-session.
  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    },
    [],
  );

  return { supported: Boolean(ctor), listening, toggle, stop };
}
