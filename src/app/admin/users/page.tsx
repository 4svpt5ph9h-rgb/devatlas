"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authorizedFetch, type AppRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

type Account = { name: string; email: string; role: AppRole };

export default function AccountsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Account | null>(null);
  const [creatableRoles, setCreatableRoles] = useState<AppRole[]>([]);
  const [role, setRole] = useState<AppRole | "">("");

  useEffect(() => {
    let active = true;
    authorizedFetch("/api/admin/users/").then(async response => {
      if (!active) return;
      if (response.status === 401) { router.replace("/login/"); return; }
      const result = await response.json();
      if (!active) return;
      if (response.ok) {
        setAllowed(true);
        const roles: AppRole[] = result.creatableRoles ?? [];
        setCreatableRoles(roles);
        setRole(roles[roles.length - 1] ?? "");
      } else {
        setError(result.error || "Only an admin or above can open this page.");
      }
    }).catch(() => { if (active) setError("Could not check access. Please reload the page."); })
      .finally(() => { if (active) setChecking(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { setAllowed(false); router.replace("/login/"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !role) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError(""); setCreated(null);
    try {
      const response = await authorizedFetch("/api/admin/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fields.get("name"), email: fields.get("email"), password: fields.get("password"), role }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) { setAllowed(false); router.replace("/login/"); }
        if (response.status === 403) setAllowed(false);
        throw new Error(result.error || "Could not create this account.");
      }
      form.reset();
      setCreated(result.user);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not connect. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="accounts-page">
      <Link href="/" className="accounts-back">← Back to projects</Link>
      <section className="accounts-card" aria-labelledby="accounts-title">
        <div className="auth-header"><span className="auth-badge">Admin only</span><h1 id="accounts-title">Create account</h1><p>Add a person to DevAtlas with a role below your own.</p></div>
        {checking && <p role="status">Checking your access…</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {created && <div className="account-success" role="status"><strong>Account created</strong><p>{created.name} ({ROLE_LABELS[created.role]}) can now sign in with {created.email} and the initial password you chose.</p></div>}
        {allowed && !checking && creatableRoles.length === 0 && <p className="auth-error" role="alert">Your role can&apos;t create any accounts.</p>}
        {allowed && !checking && creatableRoles.length > 0 && <form className="auth-form" onSubmit={createAccount} aria-busy={busy}>
          <label>Full name<input name="name" autoComplete="off" maxLength={100} required placeholder="Full name"/></label>
          <label>Email<input name="email" type="email" autoComplete="off" maxLength={254} required placeholder="name@company.com"/></label>
          <label>Role
            <select value={role} onChange={event => setRole(event.target.value as AppRole)} required>
              {creatableRoles.map(option => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
            </select>
          </label>
          <label>Initial password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required aria-describedby="password-help"/></label>
          <p id="password-help" className="form-note">Use at least 12 characters. Share the password with this person privately.</p>
          <p className="form-note">This form does not send an email.</p>
          <button className="button primary auth-button" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>}
        {!checking && !allowed && <Link href="/login/" className="button secondary auth-button">Back to sign in</Link>}
      </section>
    </main>
  );
}
