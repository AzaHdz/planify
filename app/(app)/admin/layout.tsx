import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Redirige a /dashboard a cualquier cuenta sin rol ADMIN.
  await requireAdmin();
  return <>{children}</>;
}
