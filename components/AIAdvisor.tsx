"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { AIAdviceResult, Category } from "@/types";

interface Props {
  onAddToChecklist: (categories: { icon: string; name: string; items: { label: string }[] }[]) => void;
}

export default function AIAdvisor({ onAddToChecklist }: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [situation, setSituation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAdviceResult | null>(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string; situation: string; advice: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function askAI() {
    if (!situation.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setAdded(false);
    try {
      const res = await fetch("/api/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleAddToChecklist() {
    if (!result) return;
    onAddToChecklist(
      result.categories.map((cat) => ({
        icon: cat.icon,
        name: cat.name,
        items: cat.items.map((label) => ({ label })),
      }))
    );
    setAdded(true);
  }

  function openHistory() {
    setHistoryOpen(true);
    loadHistory();
  }

  function loadHistoryEntry(entry: { situation: string; advice: string }) {
    setSituation(entry.situation);
    try {
      const parsed = JSON.parse(entry.advice) as AIAdviceResult;
      setResult(parsed);
    } catch {
      setResult(null);
    }
    setHistoryOpen(false);
    setOpen(true);
    setAdded(false);
  }

  return (
    <>
      <div className="ai-advisor-bar">
        <button className="btn-ai-open" onClick={() => setOpen(true)}>
          ✨ AIに持ち物を相談
        </button>
        {session?.user && (
          <button className="btn-history" onClick={openHistory}>
            履歴
          </button>
        )}
      </div>

      {open && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setResult(null); setSituation(""); setAdded(false); } }}>
          <div className="modal ai-modal">
            <div className="modal-header">
              <h2>✨ AIに持ち物を相談</h2>
              <button className="btn-close-modal" onClick={() => { setOpen(false); setResult(null); setSituation(""); setAdded(false); }}>✕</button>
            </div>

            {!session?.user ? (
              <div className="ai-login-prompt">
                <p>AIアドバイス機能はログインが必要です</p>
                <button className="btn-signin-prompt" onClick={() => signIn("google")}>
                  Googleでログイン
                </button>
              </div>
            ) : (
              <>
                <p className="ai-description">どんな場面・状況に行くか教えてください</p>
                <div className="ai-examples">
                  {["3泊4日の国内旅行", "日帰りハイキング", "スポーツジム", "大学の授業"].map((ex) => (
                    <button key={ex} className="btn-example" onClick={() => setSituation(ex)}>
                      {ex}
                    </button>
                  ))}
                </div>
                <textarea
                  className="ai-textarea"
                  placeholder="例：友人と2泊3日の温泉旅行に行きます。電車移動です。"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  rows={3}
                />
                <button
                  className="btn-ask-ai"
                  onClick={askAI}
                  disabled={loading || !situation.trim()}
                >
                  {loading ? "AIが考え中..." : "アドバイスをもらう"}
                </button>

                {error && <div className="ai-error">{error}</div>}

                {result && (
                  <div className="ai-result">
                    <p className="ai-advice-text">{result.advice}</p>
                    <div className="ai-result-categories">
                      {result.categories.map((cat, i) => (
                        <div key={i} className="ai-result-cat">
                          <div className="ai-result-cat-name">
                            {cat.icon} {cat.name}
                          </div>
                          <ul className="ai-result-items">
                            {cat.items.map((item, j) => (
                              <li key={j}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <button
                      className={`btn-add-to-list ${added ? "added" : ""}`}
                      onClick={handleAddToChecklist}
                      disabled={added}
                    >
                      {added ? "✅ チェックリストに追加済み" : "＋ チェックリストに追加"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setHistoryOpen(false); }}>
          <div className="modal history-modal">
            <div className="modal-header">
              <h2>📋 AI相談の履歴</h2>
              <button className="btn-close-modal" onClick={() => setHistoryOpen(false)}>✕</button>
            </div>
            {historyLoading ? (
              <p className="history-loading">読み込み中...</p>
            ) : history.length === 0 ? (
              <p className="history-empty">履歴がありません</p>
            ) : (
              <ul className="history-list">
                {history.map((entry) => (
                  <li key={entry.id} className="history-item" onClick={() => loadHistoryEntry(entry)}>
                    <span className="history-situation">{entry.situation}</span>
                    <span className="history-date">
                      {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
