"use client";

import { useState } from "react";

const target = "光月明前床";
const targetChars = target.split("");

const rollouts = [
  { id: 1, output: "光月明前床", chars: ["光", "月", "明", "前", "床"] },
  { id: 2, output: "光月前明床", chars: ["光", "月", "前", "明", "床"] },
  { id: 3, output: "光明月前床", chars: ["光", "明", "月", "前", "床"] },
  { id: 4, output: "光月明床前", chars: ["光", "月", "明", "床", "前"] },
];

function computeRewards(rollout: typeof rollouts[0], partial: boolean) {
  if (!partial) {
    const exact = rollout.output === target;
    return { 
      charRewards: rollout.chars.map(() => exact ? 1 : 0),
      total: exact ? 1 : 0,
      label: exact ? "1.00" : "0.00"
    };
  }
  
  const charRewards = rollout.chars.map((char, i) => char === targetChars[i] ? 1 : 0);
  const total = charRewards.reduce((a: number, b: number) => a + b, 0) / charRewards.length;
  return { 
    charRewards, 
    total,
    label: total.toFixed(2)
  };
}

export function RewardsDiagram() {
  const [usePartialRewards, setUsePartialRewards] = useState(false);

  const rewards = rollouts.map(r => ({
    ...r,
    ...computeRewards(r, usePartialRewards)
  }));

  const avgReward = rewards.reduce((sum, r) => sum + r.total, 0) / rewards.length;
  const advantages = rewards.map(r => r.total - avgReward);

  return (
    <div className="my-8">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Target */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">Target</span>
            <div className="flex gap-1">
              {targetChars.map((char, i) => (
                <div
                  key={i}
                  className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded text-sm font-medium"
                >
                  {char}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rollouts */}
        <div className="divide-y divide-gray-100">
          {rewards.map((rollout, idx) => (
            <div key={rollout.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16">Rollout {rollout.id}</span>
                <div className="flex gap-1">
                  {rollout.chars.map((char, i) => {
                    const isCorrect = char === targetChars[i];
                    return (
                      <div
                        key={i}
                        className={`w-9 h-9 flex items-center justify-center rounded text-sm font-medium transition-all ${
                          usePartialRewards
                            ? isCorrect
                              ? "bg-black text-white"
                              : "bg-white text-gray-400 border-2 border-dashed border-gray-300"
                            : rollout.total === 1
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {char}
                      </div>
                    );
                  })}
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">reward</div>
                    <div className={`font-mono text-sm font-medium ${
                      rollout.total === 1 ? "text-black" : "text-gray-400"
                    }`}>
                      {rollout.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">advantage</div>
                    <div className={`font-mono text-sm font-medium ${
                      advantages[idx] > 0 ? "text-black" : "text-gray-400"
                    }`}>
                      {advantages[idx] >= 0 ? "+" : ""}{advantages[idx].toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Average reward (baseline)</span>
            <span className="font-mono font-medium">{avgReward.toFixed(2)}</span>
          </div>
        </div>

        {/* Insight */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {usePartialRewards ? (
              <>
                <strong>Partial rewards:</strong> Each rollout gets a different score based on character accuracy.
              </>
            ) : (
              <>
                <strong>Binary rewards:</strong> Only exact matches get reward = 1. The model can&apos;t distinguish near-misses.
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-900 font-medium">Reward function</div>
          <div className="flex">
            <button
              onClick={() => setUsePartialRewards(false)}
              className={`px-4 py-2 text-sm font-medium border transition-colors rounded-l-lg ${
                !usePartialRewards
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Binary
            </button>
            <button
              onClick={() => setUsePartialRewards(true)}
              className={`px-4 py-2 text-sm font-medium border border-l-0 transition-colors rounded-r-lg ${
                usePartialRewards
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Partial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
