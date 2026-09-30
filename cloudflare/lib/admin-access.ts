import { env } from "cloudflare:workers";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowed = [
    String((env as any).ADMIN_EMAIL || ""),
    ...String((env as any).ADDITIONAL_ADMIN_EMAILS || "").split(","),
  ];
  const normalized = email.trim().toLowerCase();
  return allowed.some((entry) => entry.trim().toLowerCase() === normalized);
}
