import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AppRole = "owner" | "member";
export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt: string;
};

function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User"),
    email: user.email ?? "",
    // Only trusted administrative metadata may grant the owner role.
    // Real company data still needs server/database membership policies.
    role: user.app_metadata?.role === "owner" ? "owner" : "member",
    createdAt: user.created_at,
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toAppUser(data.user);
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  if (!email.trim() || !password) return null;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user || !data.session) return null;
  return toAppUser(data.user);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not log out. Please try again.");
}
