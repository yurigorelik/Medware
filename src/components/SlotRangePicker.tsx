"use client";

import { useState } from "react";

interface SlotRangePickerProps {
  // Called with a finished slot. ISO strings are UTC instants ready for the API.
  onAdd: (slot: { startIso: string; endIso: string }) => void;
  disabled?: boolean;
  addLabel?: string;
  busy?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h); // 0..23

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function hourLabel(h: number): string {
  const normalized = ((h % 24) + 24) % 24;
  const period = normalized < 12 ? "AM" : "PM";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display} ${period}`;
}

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// Build a local Date from a yyyy-mm-dd string + whole hour. A local Date's
// toISOString() yields the correct UTC instant with no manual offset.
function localDate(dateStr: string, hour: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  dt.setHours(hour, 0, 0, 0); // hour === 24 rolls to next-day midnight
  return dt;
}

/**
 * Hotel-booking-style hour range picker: choose a date, click a start hour,
 * then click an end hour to stretch the range. Whole-hour granularity only —
 * no minutes.
 */
export default function SlotRangePicker({
  onAdd,
  disabled,
  addLabel = "Add slot",
  busy,
}: SlotRangePickerProps) {
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null); // inclusive last block
  const [error, setError] = useState("");

  const isToday = date === todayStr();
  const firstFutureHour = isToday ? new Date().getHours() + 1 : 0;

  function hourDisabled(h: number): boolean {
    return disabled || !date || (isToday && h < firstFutureHour);
  }

  function handleHourClick(h: number) {
    if (hourDisabled(h)) return;
    setError("");
    // Start a fresh selection if none is in progress or a range is complete.
    if (startHour === null || endHour !== null) {
      setStartHour(h);
      setEndHour(null);
      return;
    }
    if (h >= startHour) {
      setEndHour(h);
    } else {
      setStartHour(h); // moved earlier; keep choosing the end
    }
  }

  const from = startHour;
  const to = endHour ?? startHour; // inclusive

  function isSelected(h: number): boolean {
    if (from === null) return false;
    return h >= from && h <= (to as number);
  }

  function reset() {
    setStartHour(null);
    setEndHour(null);
  }

  const endExclusive = startHour === null ? null : (endHour ?? startHour) + 1;
  const hoursCount = endExclusive !== null && startHour !== null ? endExclusive - startHour : 0;

  function handleAdd() {
    setError("");
    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (startHour === null) {
      setError("Tap a start hour, then an end hour.");
      return;
    }
    const start = localDate(date, startHour);
    const end = localDate(date, (endHour ?? startHour) + 1);
    if (end <= start) {
      setError("End must be after start.");
      return;
    }
    if (start <= new Date()) {
      setError("Slots must be in the future.");
      return;
    }
    onAdd({ startIso: start.toISOString(), endIso: end.toISOString() });
    reset();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Date</label>
        <input
          type="date"
          value={date}
          min={todayStr()}
          disabled={disabled}
          onChange={(e) => {
            setDate(e.target.value);
            reset();
            setError("");
          }}
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Hours</label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {HOURS.map((h) => {
            const selected = isSelected(h);
            const isEdge = h === from || h === to;
            return (
              <button
                key={h}
                type="button"
                disabled={hourDisabled(h)}
                onClick={() => handleHourClick(h)}
                className={`px-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selected
                    ? `bg-primary-600 text-white${isEdge ? "" : " bg-opacity-80"}`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100`}
              >
                {hourLabel(h)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Tap a start hour, then an end hour to set the range.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-gray-600">
          {startHour !== null && endExclusive !== null ? (
            <>
              {date && <>{new Date(date + "T00:00").toLocaleDateString()} · </>}
              {hourLabel(startHour)} &ndash; {hourLabel(endExclusive)}
              <span className="text-gray-400">
                {" "}
                ({hoursCount} hour{hoursCount === 1 ? "" : "s"})
              </span>
            </>
          ) : (
            <span className="text-gray-400">No range selected</span>
          )}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || busy || startHour === null}
          className="btn-primary text-sm"
        >
          {busy ? "Adding..." : addLabel}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
