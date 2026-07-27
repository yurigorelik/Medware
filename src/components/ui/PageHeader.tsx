import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "./Icon";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Trail shown above the title. The last entry renders as plain text. */
  breadcrumbs?: Crumb[];
  /** Buttons or links aligned to the right of the title on wide screens. */
  actions?: ReactNode;
  /** Badges/meta shown directly beneath the title. */
  meta?: ReactNode;
  eyebrow?: string;
}

/**
 * Standard page masthead. Gives every screen the same title/description/action
 * rhythm and — via breadcrumbs — a visible sense of where you are in the app.
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="mb-8 animate-fade-in">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && (
                    <Icon
                      name="chevronRight"
                      className="h-3.5 w-3.5 text-gray-300"
                    />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="rounded px-1 py-0.5 transition-colors hover:text-primary-600"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        isLast ? "px-1 py-0.5 font-medium text-gray-700" : "px-1 py-0.5"
                      }
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-gray-600">{description}</p>
          )}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>

        {actions && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
