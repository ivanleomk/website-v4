"use client";

import { useState } from "react";

const target = "光月明前床";
const targetChars = target.split("");

const initialWeights = [
  { next: "月", prob: 0.35 },
  { next: "明", prob: 0.30 },
  { next: "前", prob: 0.20 },
  { next: "床", prob: 0.15 },
];

const updatedWeights = [
  { next: "月", prob: 0.55 },
  { next: "明", prob: 0.20 },
  { next: "前", prob: 0.15 },
  { next: "床", prob: 0.10 },
];

const rollouts = [
  { chars: ["光", "月", "明", "前", "床"], correct: true },
  { chars: ["光", "明", "月", "前", "床"], correct: false },
  { chars: ["光", "月", "前", "明", "床"], correct: false },
  { chars: ["光", "月", "明", "前", "床"], correct: true },
];

export function RLPipelineDiagram() {
  const [step, setStep] = useState<"sample" | "score" | "update">("sample");
  
  const weights = step === "update" ? updatedWeights : initialWeights;
  const showRewards = step === "score" || step === "update";
  const showUpdate = step === "update";

  const handleNext = () => {
    if (step === "sample") setStep("score");
    else if (step === "score") setStep("update");
  };

  const handleReset = () => setStep("sample");

  return (
    <div className="my-8">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Rollouts */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-900">Rollouts</div>
          <div className="text-xs text-gray-500">4 samples from current policy</div>
        </div>
        <div className="p-4 space-y-2">
          {rollouts.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="text-xs text-gray-400 w-4">{i + 1}</div>
              <div className="flex gap-1 flex-1">
                {r.chars.map((char, j) => {
                  const isCorrect = char === targetChars[j];
                  return (
                    <div
                      key={j}
                      className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-all ${
                        showRewards
                          ? isCorrect
                            ? "bg-black text-white"
                            : "bg-white text-gray-400 border-2 border-dashed border-gray-300"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
              {showRewards && (
                <div className={`text-sm font-mono font-medium ${r.correct ? "text-black" : "text-gray-400"}`}>
                  {r.correct ? "r=1" : "r=0"}
                </div>
              )}
            </div>
          ))}
          
          {/* Target reference */}
          <div className="pt-2 mt-1 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-400 w-4">→</div>
              <div className="flex gap-1">
                {targetChars.map((char, j) => (
                  <div
                    key={j}
                    className="w-8 h-8 flex items-center justify-center rounded text-sm font-medium bg-gray-100 text-gray-600"
                  >
                    {char}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400">target</div>
            </div>
          </div>
        </div>

        {/* Weights */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm font-medium text-gray-900">Position 2 Probabilities</div>
          <div className="text-xs text-gray-500">
            Given <span className="font-mono bg-gray-200 px-1 rounded">光</span> at position 1, what comes next?
          </div>
        </div>
        <div className="p-4 space-y-3">
          {weights.map((w, i) => {
            const initial = initialWeights[i].prob;
            const changed = showUpdate && w.prob !== initial;
            const increased = w.prob > initial;
            
            return (
              <div key={w.next} className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-sm font-medium shrink-0">
                  {w.next}
                </span>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        changed 
                          ? increased ? "bg-black" : "bg-gray-300"
                          : "bg-gray-400"
                      }`}
                      style={{ width: `${w.prob * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {showUpdate && changed && (
                    <span className={`text-xs ${increased ? "text-black" : "text-gray-400"}`}>
                      {increased ? "↑" : "↓"}
                    </span>
                  )}
                  <span className={`font-mono text-sm w-10 text-right ${
                    changed ? (increased ? "text-black font-semibold" : "text-gray-400") : "text-gray-600"
                  }`}>
                    {Math.round(w.prob * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {showUpdate && (
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              <strong>月</strong> appeared in high-reward rollouts → probability increased
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleNext}
              disabled={step === "update"}
              className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === "sample" ? "Score Rollouts" : step === "score" ? "Update Weights" : "Complete"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            {["sample", "score", "update"].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step === s ? "bg-black" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
