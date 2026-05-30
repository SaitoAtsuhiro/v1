"use client";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return (
      <div className="auth-btn-wrap">
        <div className="auth-loading">読み込み中...</div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="auth-btn-wrap">
        <div className="user-info">
          <span className="user-name">{session.user.name ?? session.user.email}</span>
        </div>
        <button className="btn-signout" onClick={() => signOut()}>
          ログアウト
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError(isRegister ? "登録後のログインに失敗しました" : "メールアドレスまたはパスワードが違います");
    } else {
      setShowModal(false);
      setEmail("");
      setPassword("");
    }
  };

  const openModal = (register: boolean) => {
    setIsRegister(register);
    setError("");
    setEmail("");
    setPassword("");
    setShowModal(true);
  };

  return (
    <>
      <div className="auth-btn-wrap">
        <button className="btn-signin" onClick={() => openModal(false)}>
          ログイン
        </button>
      </div>

      <div
        className={`modal-overlay${showModal ? " open" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
      >
        <div className="modal">
          <div className="modal-header">
            <h2>{isRegister ? "新規登録" : "ログイン"}</h2>
            <button className="btn-close-modal" onClick={() => setShowModal(false)}>✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="パスワード（6文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && <p className="auth-error">{error}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => { setIsRegister(!isRegister); setError(""); }}
              >
                {isRegister ? "ログインへ" : "新規登録へ"}
              </button>
              <button type="submit" className="btn-confirm" disabled={loading}>
                {loading ? "処理中..." : isRegister ? "登録する" : "ログイン"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
