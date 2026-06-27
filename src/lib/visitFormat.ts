// Client-safe formatting helpers for the visits UI. Kept free of any server
// imports (prisma, next/server) so it can be used in client components.

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  BOOKED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function statusBadgeClass(status: string): string {
  return `badge ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`;
}

export function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatCost(cents: number | null, currency: string): string | null {
  if (cents == null) return null;
  if (cents === 0) return "Free";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
