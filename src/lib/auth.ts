import { supabase } from "./supabase";
import type { AppRole } from "./roles";

export type { AppRole };
export type AppUser = { id: string; name: string; email: string; role: AppRole; createdAt: string };

export async function authorizedFetch(path: string, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return new Response(JSON.stringify({ error: "Please sign in." }), { status: 401 });
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(path, { ...init, headers, cache: "no-store" });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const response = await authorizedFetch("/api/session/");
  if (response.status === 401) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not check your account.");
  return result.user;
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  if (!email.trim() || !password) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user || !data.session) return null;
  try {
    return await getCurrentUser();
  } catch (error) {
    await supabase.auth.signOut({ scope: "local" });
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not log out. Please try again.");
}
