"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  OWNER_ACCESS_CODE,
  getCurrentUser,
  getOwnerAccessFlag,
  setOwnerAccessFlag,
  signIn,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerCode, setOwnerCode] = useState("");
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      const user = await getCurrentUser();
      if (user) {
        router.replace("/");
        return;
      }
      setOwnerUnlocked(getOwnerAccessFlag());
    }

    checkSession();
  }, [router]);

  function unlockOwnerAccess() {
    if (ownerCode.trim() === OWNER_ACCESS_CODE) {
      setOwnerAccessFlag(true);
      setOwnerUnlocked(true);
      setError("");
      return;
    }

    setError("Incorrect owner access code.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const user = await signIn(email, password);
    if (!user) {
      setError("Wrong email or password.");
      return;
    }

    router.replace("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">Public access</span>
          <h1>Sign in</h1>
          <p>Use your DevAtlas account to continue.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="button primary auth-button">
            Log in
          </button>
        </form>

        <div className="owner-gate">
          {!ownerUnlocked ? (
            <div className="owner-code-row">
              <input
                type="password"
                value={ownerCode}
                onChange={(event) => setOwnerCode(event.target.value)}
                placeholder="Owner access code"
              />
              <button type="button" className="button secondary" onClick={unlockOwnerAccess}>
                Unlock
              </button>
            </div>
          ) : (
            <Link href="/register" className="owner-link">
              Create owner account
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
