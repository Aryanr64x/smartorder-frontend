"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { sendVoiceQueryStream, sendTextQueryStream } from "../../lib/api";
import { useCart } from "../../components/CartContext";
import { Message, VoiceState } from "../../interfaces";
import VoiceButton from "../../components/VoiceButton";
import ChatMessages from "../../components/ChatMessages";
import VoiceOverlay from "../../components/VoiceOverlay";
import CartDrawer from "../../components/CartDrawer";

// ── VAD config ─────────────────────────────────────────────────────
const CALIBRATION_MS = 300;
const SILENCE_DELAY_MS = 1800;
const SPEECH_MIN_MS = 400;
const NOISE_MULTIPLIER = 2.5;

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [duration, setDuration] = useState(0);
  const [isContinuous, setContinuous] = useState(false);
  const [vadLevel, setVadLevel] = useState(0);

  const { totalItems } = useCart();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const isContinuousRef = useRef(isContinuous);
  const handleAudioBlobRef = useRef<((blob: Blob) => Promise<void>) | null>(null);

  // VAD state refs
  const vadCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const hasSpeechRef = useRef(false);
  const speechThreshRef = useRef(8);

  useEffect(() => { isContinuousRef.current = isContinuous; }, [isContinuous]);

  // ── TTS playback ─────────────────────────────────────────────────
  const stopAudio = useCallback((then?: () => void) => {
    try { audioSrcRef.current?.stop(); } catch (_) { }
    audioSrcRef.current = null;
    then?.();
  }, []);

  const playBase64Audio = useCallback(async (b64: string, onEnd: () => void) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const audioBuf = await ctx.decodeAudioData(buf.buffer);
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(ctx.destination);
      src.onended = () => { audioSrcRef.current = null; onEnd(); };
      src.start(0);
      audioSrcRef.current = src;
    } catch (err) {
      console.error("[voice] audio playback error:", err);
      onEnd();
    }
  }, []);

  const onResponseComplete = useCallback(() => {
    if (isContinuousRef.current) {
      setTimeout(() => startRecordingFn(), 400);
    } else {
      setVoiceState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle blob → /menu/voice/stream ─────────────────────────────
  const handleAudioBlob = useCallback(async (blob: Blob) => {
    const elapsed = Date.now() - recordingStartRef.current;
    if (elapsed < SPEECH_MIN_MS || blob.size < 2000) {
      console.log("[vad] blob too short/small, discarding", elapsed, blob.size);
      setVoiceState("idle");
      if (isContinuousRef.current) setTimeout(() => startRecordingFn(), 300);
      return;
    }

    console.log("[voice] sending blob size:", blob.size);
    setVoiceState("processing");
    setLoading(true);

    // Add user bubble (transcript will fill it in)
    setMessages(prev => [...prev, { role: "user", content: "🎙️ …", isVoice: true }]);
    // Add empty bot bubble (text will stream into it)
    setMessages(prev => [...prev, { role: "bot", content: "", items: [], isVoice: true }]);

    // Accumulate audio chunks — play them all at the end when done
    const audioChunks: string[] = [];

    try {
      await sendVoiceQueryStream(
        blob,

        // transcript arrives first — update user bubble
        (transcript) => {
          setMessages(prev => {
            const u = [...prev];
            u[u.length - 2] = {
              ...u[u.length - 2],
              content: `🎙️ ${transcript}`,
            };
            return u;
          });
        },

        // full text + items arrive after LLM finishes — fill bot bubble
        (text, items) => {
          setLoading(false);
          setVoiceState("speaking");

          // Animate text character by character
          let i = 0;
          const iv = setInterval(() => {
            i++;
            setMessages(prev => {
              const u = [...prev];
              u[u.length - 1] = { ...u[u.length - 1], content: text.slice(0, i) };
              return u;
            });
            if (i >= text.length) {
              clearInterval(iv);
              // Set items only after full text is shown
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { ...u[u.length - 1], items };
                return u;
              });
            }
          }, 18)// same 18ms as typeMessage
        },

        // audio chunks stream in — accumulate
        (chunk) => {
          audioChunks.push(chunk);
        },

        // done — concatenate all chunks and play
        () => {
          if (audioChunks.length > 0) {
            // All chunks are base64 mp3 fragments — join and play
            const fullAudio = audioChunks.join("");
            playBase64Audio(fullAudio, () => {
              setVoiceState("idle");
              onResponseComplete();
            });
          } else {
            setVoiceState("idle");
            onResponseComplete();
          }
        }
      );
    } catch (err) {
      console.error("[voice] stream failed:", err);
      setLoading(false);
      setVoiceState("idle");
      setMessages(prev => {
        const u = [...prev];
        // clear the placeholder user bubble
        u[u.length - 2] = { ...u[u.length - 2], content: "🎙️ (could not transcribe)" };
        return u;
      });
      setMessages(prev => [
        ...prev,
        { role: "bot", content: "Oops 😅 Something went wrong. Please try again." },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playBase64Audio, onResponseComplete]);

  useEffect(() => { handleAudioBlobRef.current = handleAudioBlob; });

  // ── VAD ──────────────────────────────────────────────────────────
  const getRms = (analyser: AnalyserNode): number => {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length) * 100;
  };

  const stopVad = useCallback(() => {
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    try { vadCtxRef.current?.close(); } catch (_) { }
    vadCtxRef.current = null;
    analyserRef.current = null;
    setVadLevel(0);
  }, []);

  const startVad = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      vadCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const calibSamples: number[] = [];
      const calibEnd = Date.now() + CALIBRATION_MS;

      const calibrate = () => {
        if (!analyserRef.current) return;
        calibSamples.push(getRms(analyserRef.current));
        if (Date.now() < calibEnd) {
          vadRafRef.current = requestAnimationFrame(calibrate);
          return;
        }
        const ambient = calibSamples.reduce((a, b) => a + b, 0) / calibSamples.length;
        speechThreshRef.current = Math.max(2, ambient * NOISE_MULTIPLIER);
        console.log(`[vad] ambient RMS: ${ambient.toFixed(3)}, threshold: ${speechThreshRef.current.toFixed(3)}`);

        const tick = () => {
          if (!analyserRef.current) return;
          const rms = getRms(analyserRef.current);
          setVadLevel(Math.min(100, (rms / speechThreshRef.current) * 50));
          if (rms > speechThreshRef.current) {
            hasSpeechRef.current = true;
            if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
          } else if (hasSpeechRef.current && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              console.log("[vad] silence timeout — stopping recorder");
              if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
            }, SILENCE_DELAY_MS);
          }
          vadRafRef.current = requestAnimationFrame(tick);
        };
        vadRafRef.current = requestAnimationFrame(tick);
      };
      vadRafRef.current = requestAnimationFrame(calibrate);
    } catch (err) {
      console.warn("[vad] could not start analyser:", err);
    }
  }, []);

  // ── MediaRecorder ─────────────────────────────────────────────────
  const startRecordingFn = useCallback(async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert("Voice recording is not supported in your browser. Try Chrome or Edge.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      hasSpeechRef.current = false;
      recordingStartRef.current = Date.now();

      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4", ""]
          .find((m) => !m || MediaRecorder.isTypeSupported(m)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        console.log("[voice] onstop — chunks:", chunksRef.current.length);
        stopVad();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        handleAudioBlobRef.current?.(blob);
      };

      recorder.start(100);
      setVoiceState("listening");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      startVad(stream);
      console.log("[voice] recording + VAD started");
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow access and try again."
          : "Could not start recording. Check your microphone.";
      alert(msg);
      setVoiceState("idle");
    }
  }, [startVad, stopVad]);

  const stopRecordingFn = useCallback(() => {
    stopVad();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setDuration(0);
  }, [stopVad]);

  useEffect(() => () => { stopRecordingFn(); }, [stopRecordingFn]);

  const toggleVoice = useCallback(() => {
    if (voiceState === "idle") startRecordingFn();
    else if (voiceState === "listening") stopRecordingFn();
  }, [voiceState, startRecordingFn, stopRecordingFn]);

  // ── Text send (streaming) ─────────────────────────────────────────
  const sendMessage = useCallback(async (override?: string) => {
    const content = override ?? input;
    if (!content.trim() || loading) return;

    setMessages(prev => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "bot", content: "", items: [], isVoice: false }]);

    try {
      await sendTextQueryStream(
        content,
        (token) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + token };
            return updated;
          });
        },
        (items) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], items };
            return updated;
          });
          setLoading(false);
        }
      );
    } catch {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        { role: "bot", content: "Oops 😅 Something went wrong. Please try again." },
      ]);
    }
  }, [input, loading]);

  const isVoiceActive = voiceState !== "idle";

  const statusLabel =
    voiceState === "speaking" ? { dot: "bg-yellow-300 animate-pulse", text: "Speaking…" }
      : voiceState === "listening" ? { dot: "bg-red-400 animate-ping", text: "Listening…" }
        : voiceState === "processing" ? { dot: "bg-orange-300 animate-pulse", text: "Processing…" }
          : isContinuous ? { dot: "bg-blue-400 animate-pulse", text: "Voice mode active" }
            : { dot: "bg-green-400 animate-pulse", text: "Online & ready to serve" };

  return (
    <main className="min-h-screen bg-orange-500 flex flex-col items-center justify-center p-4">
      <div className="mb-5 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow">
          AI WAITER ! <span className="text-orange-900">🍽️</span>
        </h1>
        <p className="text-orange-100 text-xs mt-1.5 tracking-widest uppercase font-semibold">
          AI Waiter at your service !!
        </p>
      </div>

      <div
        className="w-full max-w-2xl bg-orange-50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: "clamp(500px, 75vh, 700px)" }}
      >
        <div className="bg-orange-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full bg-orange-800 flex items-center justify-center text-xl flex-shrink-0 shadow-inner transition-all duration-300 ${voiceState === "speaking" ? "ring-4 ring-orange-300 ring-offset-2 ring-offset-orange-600 scale-110" : ""}`}>
              🧑‍🍳
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">AI Waiter</p>
              <p className="text-orange-200 text-xs flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full inline-block ${statusLabel.dot}`} />
                {statusLabel.text}
              </p>
            </div>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white hover:bg-orange-400 active:scale-95 transition-all shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-600 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow border-2 border-orange-600 animate-bounce">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>
        </div>

        <ChatMessages messages={messages} loading={loading} voiceState={voiceState} onSuggestion={(s) => setInput(s)} />

        <VoiceOverlay
          voiceState={voiceState}
          duration={duration}
          isContinuous={isContinuous}
          vadLevel={vadLevel}
          onStop={stopRecordingFn}
          onStopSpeaking={() => stopAudio(() => { setVoiceState("idle"); onResponseComplete(); })}
          onToggleContinuous={() => setContinuous((v) => !v)}
        />

        <div className="px-4 py-3 bg-white border-t-2 border-orange-200 flex items-center gap-3 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder={isVoiceActive ? "Voice mode active…" : "What would you like to eat today?"}
            disabled={isVoiceActive}
            className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-full px-5 py-2.5 text-sm text-gray-800 placeholder-orange-300 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <VoiceButton voiceState={voiceState} disabled={loading && voiceState === "idle"} onToggle={toggleVoice} />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || isVoiceActive}
            className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-0.5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>

      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}

      <style>{`
        @keyframes voice-bar { 0%,100%{height:4px} 50%{height:20px} }
        .animate-voice-bar { animation: voice-bar 0.6s ease-in-out infinite; }
        @keyframes fade-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </main>
  );
}