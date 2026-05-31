"use client";
import { VoiceState } from "../interfaces";

interface VoiceOverlayProps {
  voiceState: VoiceState;
  duration: number;
  isContinuous: boolean;
  vadLevel: number;        // 0-100 live RMS from AnalyserNode
  onStop: () => void;
  onStopSpeaking: () => void;
  onToggleContinuous: () => void;
}

const BAR_COUNT = 7;

export default function VoiceOverlay({
  voiceState,
  duration,
  isContinuous,
  vadLevel,
  onStop,
  onStopSpeaking,
  onToggleContinuous,
}: VoiceOverlayProps) {
  if (voiceState === "idle" && !isContinuous) return null;

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Drive bar heights from live vadLevel (0-100)
  // Each bar gets a slightly different multiplier for a waveform shape
  const barMultipliers = [0.5, 0.75, 1.0, 0.85, 1.0, 0.65, 0.45];
  const minH = 3;
  const maxH = 22;


  return (
    <div className="px-4 py-2.5 bg-orange-100 border-t-2 border-orange-300 flex items-center gap-3 flex-shrink-0 animate-fade-in">

      {/* ── Live waveform bars ── */}
      <div className="flex items-center gap-[3px] flex-shrink-0" style={{ height: maxH }}>
        {voiceState === "listening" ? (
          // Real-time VAD-driven bars
          Array.from({ length: BAR_COUNT }).map((_, i) => {
            const h = minH + (maxH - minH) * (vadLevel / 100) * barMultipliers[i];
            return (
              <span
                key={i}
                className="w-[3px] rounded-full bg-red-500 inline-block transition-all duration-75"
                style={{ height: h }}
              />
            );
          })
        ) : voiceState === "speaking" ? (
          // CSS animated bars for TTS playback
          Array.from({ length: BAR_COUNT }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-orange-500 inline-block"
              style={{
                animation: `speakBar 0.65s ease-in-out ${i * 70}ms infinite alternate`,
                height: minH,
              }}
            />
          ))
        ) : voiceState === "processing" ? (
          [0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[3px] h-[3px] rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))
        ) : (
          // idle + continuous
          <span className="w-2 h-2 rounded-full bg-orange-300 animate-pulse" />
        )}
      </div>

      {/* ── Label ── */}
      <p className="flex-1 text-xs text-orange-700 font-medium italic truncate">
        {voiceState === "listening" && (
          <>
            {vadLevel > 15 ? "🗣 Speaking…" : "🎙 Listening…"}
            <span className="ml-2 font-mono not-italic text-orange-500">{fmt(duration)}</span>
          </>
        )}
        {voiceState === "processing" && "Processing…"}
        {voiceState === "speaking"   && "Speaking…"}
        {voiceState === "idle"       && isContinuous && "Voice mode — will listen after each reply"}
      </p>

      {/* ── Continuous toggle ── */}
      <button
        onClick={onToggleContinuous}
        title={isContinuous ? "Turn off continuous voice mode" : "Turn on continuous voice mode"}
        className={`flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-1 border transition-colors flex-shrink-0 ${
          isContinuous
            ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
            : "text-orange-500 border-orange-400 hover:bg-orange-200"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isContinuous ? "bg-white" : "bg-orange-400"}`} />
        {isContinuous ? "Continuous ON" : "Continuous OFF"}
      </button>

      {/* ── Stop / Skip ── */}
      {voiceState === "listening" && (
        <button
          onClick={onStop}
          className="text-[10px] font-bold text-orange-600 border border-orange-400 rounded-full px-2.5 py-1 hover:bg-orange-200 transition-colors flex-shrink-0"
        >
          ✕ Stop
        </button>
      )}
      {voiceState === "speaking" && (
        <button
          onClick={onStopSpeaking}
          className="text-[10px] font-bold text-orange-600 border border-orange-400 rounded-full px-2.5 py-1 hover:bg-orange-200 transition-colors flex-shrink-0"
        >
          ✕ Skip
        </button>
      )}

      <style>{`
        @keyframes speakBar {
          from { transform: scaleY(0.2); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}