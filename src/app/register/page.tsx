import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="account-title">
        <div className="auth-header">
          <span className="auth-badge">DevAtlas</span>
          <h1 id="account-title">Need an account?</h1>
          <p>Ask your team lead to help you get an account. You cannot create an owner account on this page.</p>
        </div>
        <Link href="/login/" className="button primary auth-button">Back to sign in</Link>
      </section>
    </main>
  );
}
