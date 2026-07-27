import Link from "next/link";

/**
 * Wordmark. The glyph is a medical cross whose vertical stroke breaks into a
 * pulse line — the "clinical + AI" idea in one mark.
 */
export default function Logo({
  href = "/",
  className = "",
  showWordmark = true,
}: {
  href?: string | null;
  className?: string;
  showWordmark?: boolean;
}) {
  const content = (
    <>
      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 shadow-glow">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          aria-hidden="true"
        >
          <path
            d="M9.5 3.5h5v5h5v5h-5v5h-5v-5h-5v-5h5v-5Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
          <path
            d="M3 12h3.2l1.6-3.4L10.5 16l2-5.2 1.4 2.4h1.9"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 8.5v7M21.5 12h-7"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Med<span className="text-primary-600">Ware</span>
        </span>
      )}
    </>
  );

  const classes = `group inline-flex items-center gap-2.5 transition-transform duration-200 ease-smooth hover:scale-[1.02] ${className}`;

  if (!href) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href={href} className={classes} aria-label="MedWare home">
      {content}
    </Link>
  );
}
