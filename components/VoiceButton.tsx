"use client";
import { VoiceState } from "../interfaces";

interface VoiceButtonProps {
  voiceState: VoiceState;
  disabled?: boolean;
  onToggle: () => void;
}

export default function VoiceButton({ voiceState, disabled, onToggle }: VoiceButtonProps) {
  const isListening  = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isSpeaking   = voiceState === "speaking";
  const isBusy       = isProcessing || isSpeaking;

  return (
    <button
      onClick={onToggle}
      disabled={disabled || isBusy}
      aria-label={isListening ? "Stop recording" : "Start voice input"}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all flex-shrink-0
        ${isListening
          ? "bg-red-500 hover:bg-red-600 text-white scale-110"
          : isBusy
          ? "bg-orange-400 text-white cursor-not-allowed"
          : "bg-orange-100 hover:bg-orange-200 text-orange-600 hover:scale-105 active:scale-95"
        }
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
      `}
    >
      {/* Pulsing ring when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-400 opacity-40 animate-ping" />
          <span className="absolute inset-[-4px] rounded-full border-2 border-red-400 opacity-60 animate-pulse" />
        </>
      )}

      {isProcessing ? (
        /* Spinner */
        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : isSpeaking ? (
        /* Sound wave icon when speaking */
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
          <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
        </svg>
      ) : isListening ? (
        /* Stop square */
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        /* Mic icon */
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4z" />
          <path d="M6.343 14.343A7.965 7.965 0 004 12H2a10 10 0 009 9.95V23h2v-1.05A10 10 0 0022 12h-2a7.965 7.965 0 01-2.343 5.657A7.965 7.965 0 0112 20a7.965 7.965 0 01-5.657-2.343z" />
        </svg>
      )}
    </button>
  );
}