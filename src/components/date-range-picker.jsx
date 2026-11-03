'use client';
import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
const presets = [
  ['all', 'All time'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['month', 'Month to date'],
  ['365', 'Last 1 year'],
];
const add = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const format = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export function DateRangePicker({ onApply }) {
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(new Date(2026, 8, 23));
  const [applied, setApplied] = useState({ preset: '30', start: add(today, -29), end: today });
  const [draft, setDraft] = useState(applied);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectingEnd, setSelectingEnd] = useState(false);
  function show(value) {
    if (value) {
      const anchor = window.GradRightDB?.today || today;
      setToday(anchor);
      setDraft(applied);
      setMonth(new Date(applied.end.getFullYear(), applied.end.getMonth(), 1));
      setSelectingEnd(false);
    }
    setOpen(value);
  }
  function preset(id) {
    const end = id === 'yesterday' ? add(today, -1) : today;
    const start =
      id === 'all'
        ? new Date(2020, 0, 1)
        : id === 'month'
          ? new Date(today.getFullYear(), today.getMonth(), 1)
          : ['today', 'yesterday'].includes(id)
            ? end
            : add(end, 1 - Number(id));
    setDraft({ preset: id, start, end });
    setMonth(new Date(end.getFullYear(), end.getMonth(), 1));
    setSelectingEnd(false);
  }
  function choose(date) {
    if (!selectingEnd) {
      setDraft({ preset: 'custom', start: date, end: date });
      setSelectingEnd(true);
    } else {
      setDraft({
        preset: 'custom',
        start: date < draft.start ? date : draft.start,
        end: date < draft.start ? draft.start : date,
      });
      setSelectingEnd(false);
    }
  }
  const rangeLabel = (range) => {
    if (range.preset === 'all') return 'All time';
    const withYear =
      range.start.getFullYear() !== range.end.getFullYear() ||
      range.end.getFullYear() !== today.getFullYear();
    const compact = (date) =>
      date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      });
    return key(range.start) === key(range.end)
      ? compact(range.start)
      : `${compact(range.start)} – ${compact(range.end)}`;
  };
  const label = rangeLabel(applied);
  const shortDate = (date) =>
    date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(draft.start.getFullYear() !== draft.end.getFullYear() ||
      date.getFullYear() !== today.getFullYear()
        ? { year: 'numeric' }
        : {}),
    });
  const days =
    Math.round(
      (Date.UTC(draft.end.getFullYear(), draft.end.getMonth(), draft.end.getDate()) -
        Date.UTC(draft.start.getFullYear(), draft.start.getMonth(), draft.start.getDate())) /
        86400000,
    ) + 1;
  const summary =
    draft.preset === 'all'
      ? 'All time'
      : `${shortDate(draft.start)}${key(draft.start) === key(draft.end) ? '' : ` – ${shortDate(draft.end)}`} · ${days} ${days === 1 ? 'day' : 'days'}`;
  return (
    <Popover open={open} onOpenChange={show}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="date-range-trigger"
          aria-label={`Date range: ${label}`}
        >
          {label}
          <ChevronDown size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="unified-date-picker">
        <div className="date-picker-body">
          <div className="date-picker-presets" aria-label="Date range presets">
            {presets.map(([id, label]) => (
              <Button
                key={id}
                variant="ghost"
                aria-pressed={draft.preset === id}
                onClick={() => preset(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="date-picker-months">
            {[0, 1].map((offset) => {
              const date = new Date(month.getFullYear(), month.getMonth() + offset, 1);
              const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
              const padding = (date.getDay() + 6) % 7;
              return (
                <div className="date-picker-month" key={offset}>
                  <div className="date-picker-month-heading">
                    {offset === 0 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Previous month"
                        onClick={() =>
                          setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                        }
                      >
                        <ChevronLeft />
                      </Button>
                    ) : (
                      <span />
                    )}
                    <strong>
                      {date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </strong>
                    {offset === 1 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Next month"
                        disabled={
                          date.getFullYear() === today.getFullYear() &&
                          date.getMonth() >= today.getMonth()
                        }
                        onClick={() =>
                          setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                        }
                      >
                        <ChevronRight />
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                  <div className="date-picker-grid">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <span className="date-picker-weekday" key={`w${i}`}>
                        {day}
                      </span>
                    ))}
                    {Array.from({ length: padding }, (_, i) => (
                      <span key={`p${i}`} />
                    ))}
                    {Array.from({ length: count }, (_, i) => {
                      const day = new Date(date.getFullYear(), date.getMonth(), i + 1);
                      const selected = key(day) === key(draft.start) || key(day) === key(draft.end);
                      const inside =
                        draft.preset !== 'all' && day >= draft.start && day <= draft.end;
                      return (
                        <button
                          type="button"
                          key={i}
                          aria-label={format(day)}
                          aria-pressed={selected}
                          disabled={day > today}
                          data-selected={selected}
                          data-range-start={key(day) === key(draft.start)}
                          data-range-end={key(day) === key(draft.end)}
                          data-in-range={inside}
                          onClick={() => choose(day)}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="date-picker-footer">
          <span aria-live="polite">{selectingEnd ? 'Choose an end date' : summary}</span>
          <Button
            disabled={selectingEnd}
            onClick={() => {
              setApplied(draft);
              onApply?.(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
