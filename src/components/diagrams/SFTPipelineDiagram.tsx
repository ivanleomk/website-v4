"use client";

import { useState, useEffect, useCallback } from "react";

const inputText = "床前明月光";
const tokens = [
  { char: "光", prob: 0.10, loss: 2.30, correct: true },
  { char: "月", prob: 0.15, loss: 1.90, correct: true },
  { char: "明", prob: 0.25, loss: 1.39, correct: true },
  { char: "前", prob: 0.40, loss: 0.92, correct: true },
  { char: "床", prob: 0.70, loss: 0.36, correct: true },
];

export function SFTPipelineDiagram() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const nextStep = useCallback(() => {
    setStep((prev) => {
      if (prev >= tokens.length) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = () => {
    setStep(0);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (step >= tokens.length) {
      setStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(nextStep, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, nextStep]);

  const visibleTokens = tokens.slice(0, step);
  const currentToken = step > 0 && step <= tokens.length ? tokens[step - 1] : null;
  const totalLoss = visibleTokens.reduce((sum, t) => sum + t.loss, 0);



  return (
    <div className="my-8">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700">
            <strong>SFT trains the model to predict the next token.</strong> Lower probability = higher loss = stronger penalty.
          </p>
        </div>

        {/* Main content */}
        <div className="px-4 py-4 space-y-4">
          {/* Input */}
          <div>
            <div className="text-xs text-gray-400 mb-2">Input sequence</div>
            <div className="flex gap-1.5">
              {inputText.split("").map((char, i) => (
                <div
                  key={i}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-lg font-medium"
                >
                  {char}
                </div>
              ))}
            </div>
          </div>

          {/* Output */}
          <div>
            <div className="text-xs text-gray-400 mb-2">Model predictions (reversed)</div>
            <div className="flex gap-1.5 min-h-[44px]">
              {visibleTokens.map((token, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-medium transition-all duration-300 ${
                    i === visibleTokens.length - 1
                      ? "bg-black text-white scale-110"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  {token.char}
                </div>
              ))}
              {step < tokens.length && (
                <div className="w-10 h-10 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-300 text-lg">
                  ?
                </div>
              )}
            </div>
          </div>

          {/* Current prediction */}
          <div className="rounded-lg p-3 min-h-[60px] bg-gray-50">
            {currentToken ? (
              <div className="font-mono text-sm flex items-center flex-wrap gap-x-2">
                <span className="text-gray-500">Predict</span>
                <span className="inline-flex items-center justify-center w-6 h-6 bg-black text-white rounded text-xs font-medium">
                  {currentToken.char}
                </span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-500">P = {(currentToken.prob * 100).toFixed(0)}%</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-500">loss = -log({currentToken.prob.toFixed(2)}) =</span>
                <span className="font-semibold text-black">{currentToken.loss.toFixed(2)}</span>
              </div>
            ) : step === 0 ? (
              <div className="text-sm text-gray-400">
                Press play to see token-by-token training
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Sequence complete
              </div>
            )}
          </div>

          {/* Token loss breakdown */}
          {step > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {visibleTokens.map((token, i) => (
                <div key={i} className="px-2 py-1 rounded text-xs font-mono bg-gray-100">
                  <span className="text-gray-600">{token.char}</span>
                  <span className="ml-1 text-gray-800">{token.loss.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total loss */}
        <div className="px-4 py-3 bg-gray-50">
          <div className="font-mono text-sm flex items-center justify-between">
            <span className="text-gray-500">Total loss</span>
            {step > 0 ? (
              <span className="font-semibold text-black">{totalLoss.toFixed(2)}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              {isPlaying ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={prevStep}
                disabled={step <= 0}
                className="inline-flex items-center justify-center w-9 h-9 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-300" />
              <button
                onClick={nextStep}
                disabled={step >= tokens.length}
                className="inline-flex items-center justify-center w-9 h-9 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-black transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
          <div className="text-sm text-gray-500 font-mono">
            {step} / {tokens.length}
          </div>
        </div>
      </div>
    </div>
  );
}
