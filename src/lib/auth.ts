import { supabase } from "./supabase";

export const OWNER_ACCESS_CODE = "DEVATLAS-OWNER";
export const DEFAULT_OWNER_EMAIL = "owner@devatlas.local";
export const DEFAULT_OWNER_PASSWORD = "DevAtlasOwner2026";

export type AppRole = "owner" | "member";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt: string;
};

const CURRENT_USER_KEY = "devatlas_current_user";
const OWNER_ACCESS_KEY = "devatlas_owner_access";

function readLocalUser(): AppUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AppUser | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }

  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function getCurrentUser(): Promise<AppUser | null> {
  if (typeof window === "undefined") return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    setCurrentUser(null);
    return readLocalUser();
  }

  const authUser = session.user;
  const user: AppUser = {
    id: authUser.id,
    name: String(authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? "User"),
    email: authUser.email ?? "",
    role: authUser.user_metadata?.role === "owner" ? "owner" : "member",
    createdAt: authUser.created_at ?? new Date().toISOString(),
  };

  setCurrentUser(user);
  return user;
}

export function getOwnerAccessFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OWNER_ACCESS_KEY) === "true";
}

export function setOwnerAccessFlag(value: boolean) {
  if (typeof window === "undefined") return;

  if (value) {
    window.localStorage.setItem(OWNER_ACCESS_KEY, "true");
  } else {
    window.localStorage.removeItem(OWNER_ACCESS_KEY);
  }
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password.trim()) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) return null;

  const user: AppUser = {
    id: data.user.id,
    name: String(data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "User"),
    email: data.user.email ?? normalizedEmail,
    role: data.user.user_metadata?.role === "owner" ? "owner" : "member",
    createdAt: data.user.created_at ?? new Date().toISOString(),
  };

  setCurrentUser(user);
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
  setCurrentUser(null);
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  ownerCode: string;
}): Promise<AppUser> {
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();
  const trimmedPassword = input.password.trim();

  if (input.ownerCode.trim() !== OWNER_ACCESS_CODE) {
    throw new Error("Owner access required.");
  }

  if (!trimmedName || !trimmedEmail || !trimmedPassword) {
    throw new Error("Please fill in all fields.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password: trimmedPassword,
    options: {
      data: {
        full_name: trimmedName,
        role: "owner",
        owner_code: input.ownerCode.trim(),
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Registration failed.");
  }

  const user: AppUser = {
    id: data.user?.id ?? crypto.randomUUID(),
    name: trimmedName,
    email: trimmedEmail,
    role: "owner",
    createdAt: data.user?.created_at ?? new Date().toISOString(),
  };

  setCurrentUser(user);
  setOwnerAccessFlag(true);
  return user;
}
