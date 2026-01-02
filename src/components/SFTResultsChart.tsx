"use client";

interface DataPoint {
  label: string;
  avg: number;
  std: number;
}

const data: DataPoint[] = [
  { label: "Base Model", avg: 0.008, std: 0.013 },
  { label: "100", avg: 0.009, std: 0.015 },
  { label: "500", avg: 0.32, std: 0.209 },
  { label: "2500", avg: 0.849, std: 0.273 },
  { label: "5000", avg: 0.916, std: 0.227 },
  { label: "10000", avg: 0.948, std: 0.189 },
];

export function SFTResultsChart() {
  const maxValue = 1.0;
  const chartHeight = 200;

  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-white">
      <div className="text-sm font-medium text-black mb-6 text-center">
        SFT Performance vs Training Examples
      </div>

      <div className="flex items-end justify-between gap-3 h-[200px] px-4">
        {data.map((point, i) => {
          const barHeight = (point.avg / maxValue) * chartHeight;
          const stdHeight = (point.std / maxValue) * chartHeight;

          return (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className="relative w-full flex flex-col items-center justify-end"
                style={{ height: chartHeight }}
              >
                {/* Standard deviation indicator */}
                <div
                  className="absolute w-px bg-gray-400"
                  style={{
                    height: stdHeight,
                    bottom: barHeight - stdHeight / 2,
                  }}
                />
                <div
                  className="absolute w-3 h-px bg-gray-400"
                  style={{ bottom: barHeight + stdHeight / 2 }}
                />
                <div
                  className="absolute w-3 h-px bg-gray-400"
                  style={{ bottom: barHeight - stdHeight / 2 }}
                />

                {/* Main bar */}
                <div
                  className="w-full max-w-[40px] bg-black rounded-t transition-all duration-300"
                  style={{ height: barHeight }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between gap-3 px-4 mt-2 border-t border-gray-200 pt-2">
        {data.map((point, i) => (
          <div
            key={i}
            className="flex-1 text-center text-xs text-gray-600 font-mono"
          >
            {point.label === "Base Model" ? "Base" : `n=${point.label}`}
          </div>
        ))}
      </div>

      {/* Values display */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-6 gap-2 text-xs">
          {data.map((point, i) => (
            <div key={i} className="text-center">
              <div className="font-mono text-black font-medium">
                {point.avg.toFixed(3)}
              </div>
              <div className="text-gray-400">±{point.std.toFixed(3)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-black rounded-sm" />
          <span>Avg Reward</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-px bg-gray-400" />
          <span>Std Dev</span>
        </div>
      </div>
    </div>
  );
}
