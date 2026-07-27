import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

/* -------------------------------------------------------------- loading -- */

/**
 * Full-height loading screen. Replaces the bare "Loading..." text with a
 * branded pulse so a slow fetch still feels like part of the product.
 */
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-primary-500/20" />
        <div className="icon-tile-lg relative bg-primary-600 text-white shadow-glow">
          <Icon name="heart" className="h-6 w-6" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-500">{label}…</p>
    </div>
  );
}

/** Shimmering placeholder line. Width is passed through as a utility class. */
export function SkeletonLine({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Card-shaped placeholder that mirrors the real list-row layout. */
export function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className="skeleton h-12 w-12 flex-shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-4 w-1/3" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
        <div className="skeleton h-8 w-24 flex-shrink-0 rounded-full" />
      </div>
    </div>
  );
}

/** A stack of skeleton cards for list-shaped pages. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading content">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- empty -- */

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
}

/**
 * Friendly zero-state with a clear next step, so an empty dashboard still
 * points somewhere instead of dead-ending.
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="blob -inset-4 bg-primary-200/40" />
        <div className="icon-tile-lg relative border border-primary-100 bg-primary-50 text-primary-600">
          <Icon name={icon} className="h-6 w-6" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-6">
          {actionLabel}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      )}
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- stat -- */

type StatTone = "primary" | "accent" | "amber" | "emerald" | "red" | "gray";

const STAT_TONES: Record<StatTone, { tile: string; value: string; bar: string }> = {
  primary: {
    tile: "bg-primary-50 text-primary-600",
    value: "text-primary-700",
    bar: "from-primary-500 to-primary-300",
  },
  accent: {
    tile: "bg-accent-50 text-accent-600",
    value: "text-accent-700",
    bar: "from-accent-500 to-accent-300",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600",
    value: "text-amber-600",
    bar: "from-amber-500 to-amber-300",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-600",
    bar: "from-emerald-500 to-emerald-300",
  },
  red: {
    tile: "bg-red-50 text-red-600",
    value: "text-red-600",
    bar: "from-red-500 to-red-300",
  },
  gray: {
    tile: "bg-gray-100 text-gray-600",
    value: "text-gray-900",
    bar: "from-gray-400 to-gray-300",
  },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: IconName;
  tone?: StatTone;
  hint?: string;
  href?: string;
}

/** Metric tile used across the patient, doctor and admin dashboards. */
export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
  hint,
  href,
}: StatCardProps) {
  const styles = STAT_TONES[tone];

  const body = (
    <>
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.bar}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`stat-value ${styles.value}`}>{value}</div>
          <div className="stat-label">{label}</div>
          {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
        </div>
        {icon && (
          <span className={`icon-tile ${styles.tile}`}>
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="stat-card block hover:-translate-y-0.5">
        {body}
      </Link>
    );
  }

  return <div className="stat-card">{body}</div>;
}
