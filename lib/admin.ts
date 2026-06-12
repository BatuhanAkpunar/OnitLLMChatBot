import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/user";

/** Server-side guard for admin routes/actions. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isAdmin) redirect("/");
  return user;
}
