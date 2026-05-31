"use client";
import { useRef, useCallback } from "react";
import { base64ToArrayBuffer } from "../lib/api";

export function useAudioPlayer(onEnd?: () => void) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef   = useRef<AudioBufferSourceNode | null>(null);

  const getCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  const stopAudio = useCallback(() => {
    try { sourceRef.current?.stop(); } catch (_) { /* already stopped */ }
    sourceRef.current = null;
    onEnd?.();
  }, [onEnd]);

  const playBase64Audio = useCallback(
    async (b64: string) => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const buf = await ctx.decodeAudioData(base64ToArrayBuffer(b64));
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.onended = () => { sourceRef.current = null; onEnd?.(); };
        src.start(0);
        sourceRef.current = src;
      } catch (err) {
        console.error("Audio playback error:", err);
        onEnd?.(); // still progress state even if audio fails
      }
    },
    [onEnd]
  );

  return { playBase64Audio, stopAudio };
}