"use client";

/**
 * SpeakingAnimation
 * Shows an animated sound-wave when the bot is "speaking" (TTS audio playing).
 * Uses 7 bars with staggered animation for a natural waveform feel.
 */
export default function SpeakingAnimation({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights: Record<string, string> = {
    sm: "h-3",
    md: "h-5",
    lg: "h-8",
  };
  const widths: Record<string, string> = {
    sm: "w-[2px]",
    md: "w-[3px]",
    lg: "w-[4px]",
  };

  const delays = [0, 80, 160, 100, 200, 60, 140];
  const baseH  = [30, 60, 100, 80, 50, 90, 40]; // % of container height

  return (
    <span className="flex items-center gap-[3px]" style={{ height: size === "sm" ? 12 : size === "lg" ? 32 : 20 }}>
      {delays.map((delay, i) => (
        <span
          key={i}
          className={`${widths[size]} rounded-full bg-orange-500 inline-block`}
          style={{
            animation: `speakBar 0.7s ease-in-out ${delay}ms infinite alternate`,
            transformOrigin: "bottom",
          }}
        />
      ))}
      <style>{`
        @keyframes speakBar {
          from { transform: scaleY(0.15); opacity: 0.5; }
          to   { transform: scaleY(1);    opacity: 1;   }
        }
      `}</style>
    </span>
  );
}