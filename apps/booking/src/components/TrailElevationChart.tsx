interface Village {
  name: string;
  altitude: number;
  trailPosition: number;
}

interface Props {
  villages: Village[];
}

const WIDTH = 800;
const HEIGHT = 280;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 60; // room for village labels
const PADDING_LEFT = 50; // room for altitude axis labels
const PADDING_RIGHT = 20;

const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

function niceRoundUp(n: number, step: number = 500): number {
  return Math.ceil(n / step) * step;
}
function niceRoundDown(n: number, step: number = 500): number {
  return Math.floor(n / step) * step;
}

export default function TrailElevationChart({ villages }: Props) {
  const sorted = [...villages].sort((a, b) => a.trailPosition - b.trailPosition);
  if (sorted.length < 2) return null;

  const altitudes = sorted.map((v) => v.altitude);
  const maxAlt = niceRoundUp(Math.max(...altitudes), 500);
  const minAlt = Math.max(0, niceRoundDown(Math.min(...altitudes) - 200, 500));
  const altRange = maxAlt - minAlt;

  // X positions evenly spaced
  function xAt(i: number): number {
    return PADDING_LEFT + (i / (sorted.length - 1)) * PLOT_WIDTH;
  }
  function yAt(altitude: number): number {
    return (
      PADDING_TOP +
      PLOT_HEIGHT -
      ((altitude - minAlt) / altRange) * PLOT_HEIGHT
    );
  }

  const points = sorted.map((v, i) => ({ x: xAt(i), y: yAt(v.altitude), v }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath =
    `${linePath} L ${points[points.length - 1].x} ${PADDING_TOP + PLOT_HEIGHT} ` +
    `L ${points[0].x} ${PADDING_TOP + PLOT_HEIGHT} Z`;

  // Y-axis gridlines at every 500m
  const gridlines: number[] = [];
  for (let alt = minAlt; alt <= maxAlt; alt += 500) gridlines.push(alt);

  const totalAscent = sorted.reduce((sum, v, i) => {
    if (i === 0) return 0;
    const diff = v.altitude - sorted[i - 1].altitude;
    return sum + Math.max(0, diff);
  }, 0);

  const peak = sorted.reduce((max, v) => (v.altitude > max.altitude ? v : max), sorted[0]);

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200 sm:p-5 dark:bg-stone-900 dark:ring-stone-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-stone-900 dark:text-stone-100">Altitude profile</h3>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          Highest: <span className="font-semibold text-stone-700 dark:text-stone-200">{peak.name} · {peak.altitude.toLocaleString()}m</span>
          {" · "}
          Total ascent: <span className="font-semibold text-stone-700 dark:text-stone-200">+{totalAscent.toLocaleString()}m</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Altitude profile from ${sorted[0].name} (${sorted[0].altitude}m) to ${peak.name} (${peak.altitude}m)`}
      >
        <defs>
          <linearGradient id="trailGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(4, 120, 87)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(4, 120, 87)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Y gridlines + altitude labels */}
        {gridlines.map((alt) => {
          const y = yAt(alt);
          return (
            <g key={alt}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={WIDTH - PADDING_RIGHT}
                y2={y}
                className="stroke-stone-200 dark:stroke-stone-700"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={PADDING_LEFT - 8}
                y={y + 4}
                fontSize={11}
                className="fill-stone-400 dark:fill-stone-500"
                textAnchor="end"
              >
                {alt.toLocaleString()}m
              </text>
            </g>
          );
        })}

        {/* Area + line */}
        <path d={areaPath} fill="url(#trailGradient)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgb(4, 120, 87)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Village markers */}
        {points.map((p) => (
          <g key={p.v.name}>
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              className="fill-white stroke-emerald-700 dark:fill-stone-900 dark:stroke-emerald-400"
              strokeWidth={2.5}
            />
            <title>{`${p.v.name} — ${p.v.altitude.toLocaleString()}m`}</title>
          </g>
        ))}

        {/* Village name + altitude labels */}
        {points.map((p, i) => {
          const labelY = PADDING_TOP + PLOT_HEIGHT + 18;
          const altLabelY = labelY + 14;
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const anchor = isFirst ? "start" : isLast ? "end" : "middle";
          return (
            <g key={`label-${p.v.name}`}>
              <text
                x={p.x}
                y={labelY}
                fontSize={11}
                fontWeight={600}
                className="fill-stone-700 dark:fill-stone-200"
                textAnchor={anchor}
              >
                {p.v.name}
              </text>
              <text
                x={p.x}
                y={altLabelY}
                fontSize={10}
                className="fill-stone-400 dark:fill-stone-500"
                textAnchor={anchor}
              >
                {p.v.altitude.toLocaleString()}m
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        Plan acclimatization days where the gain is steepest. Most trekkers add a rest
        day when ascending more than ~500m above 3,000m.
      </p>
    </div>
  );
}
