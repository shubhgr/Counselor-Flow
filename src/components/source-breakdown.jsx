'use client';
import { useEffect, useState, useRef } from 'react';
import { arc } from 'd3-shape';
import { Switch } from './ui/switch';
import { ScrollPanel } from '@/components/ui/scroll-panel';
const colors = [
  'var(--gray-900)',
  'var(--blue-300)',
  'var(--green-400)',
  'var(--purple-400)',
  'var(--blue-700)',
  'var(--orange-400)',
  'var(--gray-400)',
];
function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current;
    let start = null,
      frame;
    const tick = (time) => {
      if (start === null) start = time;
      const progress = Math.min(1, (time - start) / 180);
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display.toLocaleString('en-IN')}</>;
}

export function SourceBreakdown() {
  const [rows, setRows] = useState([]),
    [table, setTable] = useState(false);
  useEffect(() => {
    const update = (e) => setRows(e.detail);
    window.addEventListener('counselor:source-breakdown', update);
    return () => window.removeEventListener('counselor:source-breakdown', update);
  }, []);
  const legendDrag = useRef(null);
  const [activeSource, setActiveSource] = useState(null);
  const total = rows.reduce((n, r) => n + r.count, 0);
  let offset = 0;
  return (
    <ScrollPanel
      className="source-list"
      toolbar
      head={
        <>
          <h2>Impressions</h2>
          <label className="source-view-toggle">
            <span>Graph</span>
            <Switch
              checked={table}
              onCheckedChange={setTable}
              aria-label="Show impressions as table"
            />
            <span>Table</span>
          </label>
        </>
      }
    >
      <div id="source-list" className="source-breakdown">
        {table ? (
          <table className="source-data-table">
            <thead className="sr-only">
              <tr>
                <th>Source</th>
                <th>Impressions</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((r) => (
                  <tr key={r.key || r.label}>
                    <td>
                      <i className="source-table-dot" />
                      {r.label}
                    </td>
                    <td>{r.count.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <>
            <svg
              viewBox="0 0 240 240"
              role="img"
              aria-label={`Impressions by source: ${total.toLocaleString('en-IN')} total`}
              className="source-donut"
            >
              {!total && (
                <circle
                  cx="120"
                  cy="120"
                  r="84"
                  fill="none"
                  stroke="var(--gray-100)"
                  strokeWidth="54"
                />
              )}
              {rows.map((r, i) => {
                const share = total ? r.count / total : 0;
                const start = offset;
                offset += share;
                const angle = (start + share / 2) * 2 * Math.PI - Math.PI / 2;
                return share > 0 ? (
                  <g
                    key={r.key || r.label}
                    className="source-donut-segment"
                    onMouseEnter={() => setActiveSource(r)}
                    onMouseLeave={() => setActiveSource(null)}
                    onFocus={() => setActiveSource(r)}
                    onBlur={() => setActiveSource(null)}
                    tabIndex={0}
                    role="img"
                    aria-label={`${r.label}: ${r.count}, ${Math.round(share * 100)}%`}
                    style={{
                      '--segment-color': colors[i % colors.length],
                      '--segment-delay': `${i * 60}ms`,
                      '--segment-x': `${Math.cos(angle) * 5}px`,
                      '--segment-y': `${Math.sin(angle) * 5}px`,
                    }}
                  >
                    <path
                      transform="translate(120 120)"
                      fill={colors[i % colors.length]}
                      d={arc().innerRadius(57).outerRadius(111).cornerRadius(6).padAngle(0.035)({
                        startAngle: start * Math.PI * 2,
                        endAngle: (start + share) * Math.PI * 2,
                      })}
                    >
                      <title>
                        {r.label}: {r.count} ({Math.round(share * 100)}%)
                      </title>
                    </path>
                    {share > 0 && (
                      <text
                        x={120 + 84 * Math.cos(angle)}
                        y={120 + 84 * Math.sin(angle)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={i === 1 || i === 2 ? 'var(--gray-900)' : 'white'}
                        fontSize="11"
                        fontFamily="Inter Variable, Inter, sans-serif"
                      >
                        {Math.round(share * 100)}%
                      </text>
                    )}
                  </g>
                ) : null;
              })}
              {activeSource && (
                <text
                  className="source-center-detail"
                  x="120"
                  y="120"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="20"
                  fontWeight="600"
                  fill="var(--gray-900)"
                  aria-hidden="true"
                >
                  <AnimatedCount value={activeSource.count} />
                </text>
              )}
            </svg>
            {!total && <p className="source-empty-note">No impressions in this period</p>}
            <div
              className="source-legend"
              role="region"
              aria-label="Impression sources, scroll horizontally for more"
              tabIndex={0}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                const el = event.currentTarget;
                legendDrag.current = { x: event.clientX, scroll: el.scrollLeft };
                el.setPointerCapture(event.pointerId);
                el.dataset.dragging = 'true';
              }}
              onPointerMove={(event) => {
                if (!legendDrag.current) return;
                event.currentTarget.scrollLeft =
                  legendDrag.current.scroll - (event.clientX - legendDrag.current.x);
              }}
              onPointerUp={(event) => {
                legendDrag.current = null;
                event.currentTarget.dataset.dragging = 'false';
              }}
              onPointerCancel={(event) => {
                legendDrag.current = null;
                event.currentTarget.dataset.dragging = 'false';
              }}
              onLostPointerCapture={(event) => {
                legendDrag.current = null;
                event.currentTarget.dataset.dragging = 'false';
              }}
            >
              {rows
                .filter((r) => r.count)
                .map((r, i) => (
                  <span key={r.key || r.label}>
                    <i style={{ background: colors[rows.indexOf(r) % colors.length] }} />
                    {r.label}
                  </span>
                ))}
            </div>
          </>
        )}
      </div>
    </ScrollPanel>
  );
}
