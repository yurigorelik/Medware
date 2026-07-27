"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon, { type IconName } from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * Top-level destinations per role. These used to live inside the avatar
 * dropdown, which meant every feature stayed invisible until you opened a menu.
 */
const NAV_BY_ROLE: Record<string, NavItem[]> = {
  PATIENT: [
    { href: "/patient/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/patient/doctors", label: "Find a Doctor", icon: "search" },
    { href: "/visits", label: "Visits", icon: "calendar" },
  ],
  DOCTOR: [
    { href: "/doctor/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/doctor/consultations", label: "Consultations", icon: "message" },
    { href: "/visits", label: "Visits", icon: "calendar" },
    { href: "/visits/availability", label: "Availability", icon: "clock" },
    {
      href: "/doctor/second-opinion",
      label: "AI Second Opinion",
      icon: "sparkles",
    },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/users", label: "Users", icon: "users" },
  ],
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/visits") {
    // Keep "Visits" from lighting up while you're on /visits/availability.
    return pathname === "/visits" || /^\/visits\/[^/]+$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [addRoleError, setAddRoleError] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  const activeRole = session?.user?.activeRole || session?.user?.role;
  const isBothRole = session?.user?.role === "BOTH";
  const isSingleRole =
    session?.user?.role === "DOCTOR" || session?.user?.role === "PATIENT";

  const navItems = activeRole ? (NAV_BY_ROLE[activeRole] ?? []) : [];

  const dashboardLink =
    activeRole === "ADMIN"
      ? "/admin/dashboard"
      : activeRole === "DOCTOR"
        ? "/doctor/dashboard"
        : "/patient/dashboard";

  // Lift the bar off the page once the user scrolls, so it reads as a layer.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navigating away should never leave a menu hanging open.
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleSwitchRole() {
    if (!isBothRole || switching) return;
    setSwitching(true);
    const newRole = activeRole === "DOCTOR" ? "PATIENT" : "DOCTOR";
    await update({ activeRole: newRole });
    setMenuOpen(false);
    setMobileOpen(false);
    setSwitching(false);
    const newDashboard =
      newRole === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard";
    router.push(newDashboard);
  }

  function handleAddRoleClick() {
    setMenuOpen(false);
    setMobileOpen(false);
    setAddRoleError("");
    setSpecialty("");
    setLicenseNumber("");
    setShowAddRoleModal(true);
  }

  async function handleAddRole() {
    if (addingRole) return;
    setAddingRole(true);
    setAddRoleError("");

    const targetRole = session?.user?.role === "PATIENT" ? "DOCTOR" : "PATIENT";

    try {
      const res = await fetch("/api/add-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          ...(targetRole === "DOCTOR" && {
            specialty: specialty || "General Medicine",
            licenseNumber: licenseNumber || undefined,
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddRoleError(data.error || "Failed to add role");
        setAddingRole(false);
        return;
      }

      // Update session with new role
      await update({ role: "BOTH", activeRole: targetRole });
      setShowAddRoleModal(false);
      setAddingRole(false);

      const newDashboard =
        targetRole === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard";
      router.push(newDashboard);
    } catch {
      setAddRoleError("Something went wrong. Please try again.");
      setAddingRole(false);
    }
  }

  const targetRoleLabel =
    session?.user?.role === "PATIENT" ? "Doctor" : "Patient";

  const roleBadgeClass =
    activeRole === "ADMIN"
      ? "bg-red-50 text-red-700 ring-red-600/20"
      : activeRole === "DOCTOR"
        ? "bg-accent-50 text-accent-700 ring-accent-600/20"
        : "bg-primary-50 text-primary-700 ring-primary-600/20";

  return (
    <>
      <header
        className={`sticky top-0 z-40 h-[var(--nav-height)] border-b transition-all duration-300 ease-smooth ${
          scrolled
            ? "border-gray-200 bg-white/85 shadow-sm backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-white"
        }`}
      >
        <nav
          className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
          aria-label="Main"
        >
          <div className="flex min-w-0 items-center gap-1 lg:gap-6">
            <Logo href="/" />

            {/* Desktop primary navigation */}
            {navItems.length > 0 && (
              <div className="hidden items-center gap-0.5 lg:flex">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={active ? "nav-link-active" : "nav-link"}
                    >
                      <Icon name={item.icon} className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                {/* Account menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="Account menu"
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 text-sm transition-all duration-200 hover:border-gray-300 hover:shadow-sm sm:pr-3"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
                      {session.user.name?.charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[10rem] truncate font-medium text-gray-700 sm:block">
                      {session.user.name}
                    </span>
                    <span
                      className={`hidden rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ring-1 ring-inset md:block ${roleBadgeClass}`}
                    >
                      {activeRole}
                    </span>
                    <Icon
                      name="chevronDown"
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        menuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="menu-panel absolute right-0 mt-2 w-64 origin-top-right"
                    >
                      <div className="border-b border-gray-100 px-3 pb-2.5 pt-2">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {session.user.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {session.user.email}
                        </p>
                      </div>

                      <div className="py-1.5">
                        <Link href={dashboardLink} className="menu-item">
                          <Icon
                            name="dashboard"
                            className="h-4 w-4 text-gray-400"
                          />
                          Dashboard
                        </Link>

                        {activeRole === "DOCTOR" && (
                          <Link href="/doctor/profile" className="menu-item">
                            <Icon
                              name="settings"
                              className="h-4 w-4 text-gray-400"
                            />
                            Profile Settings
                          </Link>
                        )}

                        {activeRole !== "ADMIN" && (
                          <Link href="/visits" className="menu-item">
                            <Icon
                              name="calendar"
                              className="h-4 w-4 text-gray-400"
                            />
                            Visits
                          </Link>
                        )}

                        {activeRole === "ADMIN" && (
                          <Link href="/admin/users" className="menu-item">
                            <Icon
                              name="users"
                              className="h-4 w-4 text-gray-400"
                            />
                            Manage Users
                          </Link>
                        )}
                      </div>

                      {(isBothRole || isSingleRole) && (
                        <div className="border-t border-gray-100 py-1.5">
                          {isBothRole && (
                            <button
                              onClick={handleSwitchRole}
                              disabled={switching}
                              className="menu-item-accent"
                            >
                              <Icon name="switch" className="h-4 w-4" />
                              {switching
                                ? "Switching…"
                                : `Switch to ${activeRole === "DOCTOR" ? "Patient" : "Doctor"} view`}
                            </button>
                          )}
                          {isSingleRole && (
                            <button
                              onClick={handleAddRoleClick}
                              className="menu-item-accent"
                            >
                              <Icon name="userPlus" className="h-4 w-4" />
                              Also become a {targetRoleLabel}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="border-t border-gray-100 pt-1.5">
                        <button
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="menu-item text-gray-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Icon name="logout" className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile nav toggle */}
                {navItems.length > 0 && (
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="btn-icon lg:hidden"
                    aria-expanded={mobileOpen}
                    aria-controls="mobile-nav"
                    aria-label={
                      mobileOpen ? "Close navigation" : "Open navigation"
                    }
                  >
                    <Icon
                      name={mobileOpen ? "close" : "menu"}
                      className="h-5 w-5"
                    />
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link href="/auth/signin" className="btn-ghost">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="btn-primary">
                  Get started
                  <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile navigation drawer */}
      {mobileOpen && navItems.length > 0 && (
        <div
          id="mobile-nav"
          className="sticky top-[var(--nav-height)] z-30 animate-slide-down border-b border-gray-200 bg-white/95 shadow-md backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                  {item.label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-role-title"
        >
          <div className="modal-panel">
            <div className="mb-4 flex items-start gap-3">
              <span className="icon-tile bg-primary-50 text-primary-600">
                <Icon name="userPlus" className="h-5 w-5" />
              </span>
              <div>
                <h2
                  id="add-role-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Create {targetRoleLabel} Profile
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {session?.user?.role === "PATIENT"
                    ? "Add a doctor profile to your account. You can switch between your patient and doctor views at any time."
                    : "Add a patient profile to your account. You can switch between your doctor and patient views at any time."}
                </p>
              </div>
            </div>

            {session?.user?.role === "PATIENT" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="add-role-specialty" className="label">
                    Specialty
                  </label>
                  <input
                    id="add-role-specialty"
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, General Medicine"
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="add-role-license" className="label">
                    License Number{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="add-role-license"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="Medical license number"
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {addRoleError && (
              <div className="alert-error mt-4">
                <Icon name="alert" className="h-4 w-4 flex-shrink-0" />
                <span>{addRoleError}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="btn-secondary"
                disabled={addingRole}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                disabled={addingRole}
                className="btn-primary"
              >
                {addingRole && <span className="spinner" />}
                {addingRole ? "Creating…" : `Create ${targetRoleLabel} Profile`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
