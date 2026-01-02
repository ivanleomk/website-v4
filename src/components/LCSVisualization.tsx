"use client";

import { useMemo } from "react";

interface LCSVisualizationProps {
  original: string;
  actual: string;
}

function computeLCS(s1: string, s2: string): string {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Reconstruct LCS
  let lcs = "";
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) {
      lcs = s1[i - 1] + lcs;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

function getMatchArray(expected: string, actual: string): boolean[] {
  const lcs = computeLCS(expected, actual);
  const matches: boolean[] = Array(expected.length).fill(false);

  let lcsIdx = 0;
  for (let i = 0; i < expected.length && lcsIdx < lcs.length; i++) {
    if (expected[i] === lcs[lcsIdx]) {
      matches[i] = true;
      lcsIdx++;
    }
  }

  return matches;
}

export function LCSVisualization({
  original: rawOriginal,
  actual: rawActual,
}: LCSVisualizationProps) {
  const original = rawOriginal
    .replace(/\\n/g, "\n")
    .replace(/&#10;/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  const actual = rawActual
    .replace(/\\n/g, "\n")
    .replace(/&#10;/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  const expected = useMemo(() => [...original].reverse().join(""), [original]);

  const analysis = useMemo(() => {
    const matches = getMatchArray(expected, actual);
    const lcsLength = matches.filter((m) => m).length;
    const lcsRatio = expected.length > 0 ? lcsLength / expected.length : 0;

    return { matches, lcsLength, lcsRatio };
  }, [expected, actual]);

  const containerClass = "border border-gray-200 rounded-lg p-6 mb-6 bg-white";
  const labelClass = "text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider";

  const segments = useMemo(() => {
    const result: { text: string; matched: boolean }[] = [];
    let currentSegment = "";
    let currentMatched = analysis.matches[0] ?? false;

    for (let i = 0; i < expected.length; i++) {
      const isMatched = analysis.matches[i];
      if (isMatched === currentMatched) {
        currentSegment += expected[i];
      } else {
        if (currentSegment) {
          result.push({ text: currentSegment, matched: currentMatched });
        }
        currentSegment = expected[i];
        currentMatched = isMatched;
      }
    }
    if (currentSegment) {
      result.push({ text: currentSegment, matched: currentMatched });
    }
    return result;
  }, [expected, analysis.matches]);

  return (
    <div className={containerClass}>
      {/* Title */}
      <div className="text-sm font-medium text-gray-700 mb-6">
        LCS Similarity: <span className="font-bold">{(analysis.lcsRatio * 100).toFixed(1)}%</span>
        <span className="text-gray-500 text-xs ml-2">
          ({analysis.lcsLength} / {expected.length} characters)
        </span>
      </div>

      {/* Original */}
      <div className="mb-6">
        <div className={labelClass}>Input</div>
        <div className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
          {original}
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expected */}
        <div>
          <div className={labelClass}>Expected (Reversed)</div>
          <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {segments.map((segment, i) => (
              <span
                key={i}
                className={
                  segment.matched
                    ? "bg-green-100 text-green-900 px-0.5 rounded"
                    : "text-gray-500"
                }
              >
                {segment.text}
              </span>
            ))}
          </div>
        </div>

        {/* Actual */}
        <div>
          <div className={labelClass}>Generated</div>
          <div className="text-sm leading-relaxed break-words whitespace-pre-wrap text-gray-700">
            {actual}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 mt-4 flex gap-4">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
          Matched
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
          Missing from output
        </span>
      </div>
    </div>
  );
}
