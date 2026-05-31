"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { VoiceState } from "../interfaces";

interface UseVoiceRecorderOptions {
  onAudioReady: (blob: Blob) => void;
  onError?: (msg: string) => void;
}

export interface UseVoiceRecorderReturn {
  voiceState: VoiceState;
  duration: number;
  setVoiceState: (s: VoiceState) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isSupported: boolean;
  isContinuous: boolean;
  setContinuous: (v: boolean) => void;
  /** Call this after TTS finishes so continuous mode can restart the mic */
  onResponseComplete: () => void;
}

export function useVoiceRecorder({
  onAudioReady,
  onError,
}: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [voiceState, setVoiceState]   = useState<VoiceState>("idle");
  const [duration, setDuration]       = useState(0);
  const [isContinuous, setContinuous] = useState(false);

  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!navigator.mediaDevices &&
      !!window.MediaRecorder
  );

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const streamRef         = useRef<MediaStream | null>(null);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const isContinuousRef   = useRef(isContinuous);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  // Cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { _stop(); }, []);

  const _stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setDuration(0);
  };

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.("Voice recording is not supported in your browser. Try Chrome or Edge.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4", ""].find(
          (m) => !m || MediaRecorder.isTypeSupported(m)
        ) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Release mic indicator in browser
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        onAudioReady(blob); // hand off to page
      };

      recorder.start(100); // collect in 100ms chunks
      setVoiceState("listening");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow access and try again."
          : "Could not start recording. Please check your microphone.";
      onError?.(msg);
      setVoiceState("idle");
    }
  }, [isSupported, onAudioReady, onError]);

  const stopRecording = useCallback(() => {
    _stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Page calls this when the full response cycle is done
   * (typing animation finished + TTS audio done / skipped).
   * In continuous mode → restart mic automatically.
   * In normal mode → just go idle.
   */
  const onResponseComplete = useCallback(() => {
    if (isContinuousRef.current) {
      // Small delay so user can interrupt if they want
      setTimeout(() => startRecording(), 400);
    } else {
      setVoiceState("idle");
    }
  }, [startRecording]);

  return {
    voiceState,
    duration,
    setVoiceState,
    startRecording,
    stopRecording,
    isSupported,
    isContinuous,
    setContinuous,
    onResponseComplete,
  };
}