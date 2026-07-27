import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";

const LINK_GROUPS: { title: string; links: { label: string; href: string }[] }[] =
  [
    {
      title: "For patients",
      links: [
        { label: "Find a doctor", href: "/patient/doctors" },
        { label: "My consultations", href: "/patient/dashboard" },
        { label: "Book a visit", href: "/visits/new" },
      ],
    },
    {
      title: "For doctors",
      links: [
        { label: "Doctor dashboard", href: "/doctor/dashboard" },
        { label: "Create a portal", href: "/doctor/portal/create" },
        { label: "Set availability", href: "/visits/availability" },
      ],
    },
    {
      title: "Account",
      links: [
        { label: "Sign in", href: "/auth/signin" },
        { label: "Create account", href: "/auth/signup" },
        { label: "Reset password", href: "/auth/forgot-password" },
      ],
    },
  ];

/**
 * Site-wide footer. Beyond the legal note, it doubles as a secondary map of
 * the product — the destinations here are reachable from every screen.
 */
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo href="/" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
              AI-assisted medical consultations, reviewed and approved by
              qualified physicians before they reach you.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">
                <Icon name="shield" className="h-3.5 w-3.5 text-emerald-600" />
                Physician reviewed
              </span>
              <span className="chip">
                <Icon name="lock" className="h-3.5 w-3.5 text-primary-600" />
                Private by default
              </span>
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors hover:text-primary-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} MedWare. All rights reserved.
            </p>
            <p className="max-w-2xl text-xs leading-relaxed text-gray-400">
              MedWare provides AI-assisted second opinions reviewed by qualified
              physicians. It is not a substitute for emergency medical care — if
              this is an emergency, contact your local emergency services.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
