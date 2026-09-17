"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { OWNER_ACCESS_CODE, getCurrentUser, getOwnerAccessFlag, registerUser, setOwnerAccessFlag } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [ownerCode, setOwnerCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const user = await getCurrentUser();
      if (user) {
        router.replace("/");
        return;
      }

      setIsAllowed(getOwnerAccessFlag());
    }

    checkSession();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const user = await registerUser({ name, email, password, ownerCode });
      if (user) {
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  if (!isAllowed) {
    return (
      <main className="auth-page">
        <section className="auth-card narrow">
          <div className="auth-header">
            <span className="auth-badge">Owner only</span>
            <h1>Access restricted</h1>
            <p>This registration page is only available to the project owner.</p>
          </div>

          <div className="owner-code-row">
            <input
              type="password"
              value={ownerCode}
              onChange={(event) => setOwnerCode(event.target.value)}
              placeholder="Owner access code"
            />
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                if (ownerCode.trim() === OWNER_ACCESS_CODE) {
                  setOwnerAccessFlag(true);
                  setIsAllowed(true);
                  setError("");
                  return;
                }
                setError("Incorrect owner access code.");
              }}
            >
              Unlock
            </button>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <Link href="/login" className="button primary auth-button">
            Back to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">Owner registration</span>
          <h1>Create owner account</h1>
          <p>Only the project owner can create this public account.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
          </label>

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@example.com" required />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a secure password" required />
          </label>

          <label>
            Owner access code
            <input
              type="password"
              value={ownerCode}
              onChange={(event) => setOwnerCode(event.target.value)}
              placeholder={OWNER_ACCESS_CODE}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="button primary auth-button">
            Register owner
          </button>
        </form>
      </section>
    </main>
  );
}
