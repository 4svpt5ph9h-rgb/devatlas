"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { getCurrentUser, signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser().then(user => {
      if (active && user) router.replace("/");
    }).catch(() => {
      if (active) setError("Could not check your account. Please try signing in.");
    });
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const user = await signIn(email, password);
      if (!user) {
        setError("Could not sign in. Check your email and password, and confirm your email if needed.");
        return;
      }
      router.replace("/");
    } catch {
      setError("Could not connect. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-header">
          <span className="auth-badge">DevAtlas</span>
          <h1 id="login-title">Sign in</h1>
          <p>Use your DevAtlas account to continue.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} aria-busy={busy}>
          <label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required/></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required/></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="button primary auth-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="owner-gate"><Link href="/register/" className="owner-link">Need an account?</Link></div>
      </section>
    </main>
  );
}
