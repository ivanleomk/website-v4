"use client";

import { useState, useEffect } from "react";

export function ChinesePoetryReverser() {
  const text = "床前明月光";
  const chars = text.split("");
  const reversed = [...chars].reverse();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frame < chars.length) {
      const timeout = setTimeout(() => {
        setFrame((f) => f + 1);
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [frame, chars.length]);

  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
      <div className="text-xs text-gray-500 mb-4 text-center">
        Reversing: {text}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex justify-center items-center gap-1">
          {chars.map((char, i) => {
            const sourceIndex = chars.length - 1 - i;
            const isConsumed = sourceIndex < frame;
            return (
              <div
                key={i}
                className={`w-10 h-10 flex items-center justify-center border rounded text-xl font-serif transition-all duration-300 ${
                  isConsumed
                    ? "border-gray-200 bg-gray-100 text-gray-300"
                    : "border-gray-300 bg-white text-black"
                }`}
              >
                {char}
              </div>
            );
          })}
        </div>
        <div className="flex justify-center">
          <span className="text-gray-400">↓</span>
        </div>
        <div className="flex justify-center items-center gap-1">
          {reversed.map((char, i) => {
            const isVisible = i < frame;
            return (
              <div
                key={i}
                className={`w-10 h-10 flex items-center justify-center border rounded text-xl font-serif transition-all duration-300 ${
                  isVisible
                    ? "border-gray-900 bg-black text-white"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {isVisible ? char : ""}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={() => setFrame((f) => Math.max(0, f - 1))}
          disabled={frame === 0}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ←
        </button>
        <button
          onClick={() => setFrame((f) => Math.min(chars.length, f + 1))}
          disabled={frame === chars.length}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    </div>
  );
}
