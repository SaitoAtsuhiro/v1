"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Category, Item } from "@/types";
import AIAdvisor from "./AIAdvisor";

const ICONS = ["👜","🎒","👛","🔑","📱","💳","🏥","📚","☂️","🧣","👟","💊","🎧","📝","🛒","✈️","🏋️","🍱","⛺","🏖️","🎽","💼"];
const STORAGE_KEY = "mochimonocheckv1";
const DEFAULT_DATA: { categories: Category[] } = {
  categories: [
    { id: "cat1", icon: "👛", name: "必需品", items: [
      { id: "i1", label: "財布", checked: false },
      { id: "i2", label: "鍵", checked: false },
      { id: "i3", label: "スマホ", checked: false },
    ]},
    { id: "cat2", icon: "👗", name: "衣類・身だしなみ", items: [
      { id: "i4", label: "ハンカチ", checked: false },
      { id: "i5", label: "マスク", checked: false },
    ]},
    { id: "cat3", icon: "🎒", name: "バッグの中身", items: [
      { id: "i6", label: "イヤホン", checked: false },
      { id: "i7", label: "エコバッグ", checked: false },
    ]},
  ],
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ChecklistApp() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [catNameInput, setCatNameInput] = useState("");

  const saveLocal = useCallback((cats: Category[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: cats }));
  }, []);

  const syncToServer = useCallback(async (cats: Category[]) => {
    if (!session?.user) return;
    setSyncing(true);
    setSyncError("");
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_all", categories: cats }),
      });
      if (!res.ok) throw new Error("同期エラー");
    } catch {
      setSyncError("クラウド保存に失敗しました");
    } finally {
      setSyncing(false);
    }
  }, [session]);

  const updateCategories = useCallback((cats: Category[]) => {
    setCategories(cats);
    saveLocal(cats);
    syncToServer(cats);
  }, [saveLocal, syncToServer]);

  useEffect(() => {
    async function init() {
      if (session?.user) {
        try {
          const res = await fetch("/api/checklist");
          if (res.ok) {
            const data = await res.json();
            if (data.categories && data.categories.length > 0) {
              setCategories(data.categories);
              saveLocal(data.categories);
              setLoaded(true);
              return;
            }
          }
        } catch {}
        // サーバーにデータなし → localStorageから移行
        const saved = localStorage.getItem(STORAGE_KEY);
        const cats = saved ? (JSON.parse(saved) as { categories: Category[] }).categories : DEFAULT_DATA.categories;
        setCategories(cats);
        await syncToServer(cats);
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        setCategories(saved ? (JSON.parse(saved) as { categories: Category[] }).categories : DEFAULT_DATA.categories);
      }
      setLoaded(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const checkedItems = categories.reduce((s, c) => s + c.items.filter((i) => i.checked).length, 0);
  const pct = totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

  function toggleItem(catId: string, itemId: string, checked: boolean) {
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, checked } : i) } : c
    );
    updateCategories(next);
  }

  function addItem(catId: string, label: string) {
    if (!label.trim()) return;
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: [...c.items, { id: uid(), label, checked: false }] } : c
    );
    updateCategories(next);
  }

  function deleteItem(catId: string, itemId: string) {
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
    );
    updateCategories(next);
  }

  function deleteCat(catId: string) {
    if (!confirm("このカテゴリを削除しますか？")) return;
    updateCategories(categories.filter((c) => c.id !== catId));
  }

  function resetAll() {
    if (!confirm("全てのチェックをリセットしますか？")) return;
    const next = categories.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i, checked: false })) }));
    updateCategories(next);
  }

  function openAddModal() {
    setModalMode("add");
    setEditCatId(null);
    setSelectedIcon(ICONS[0]);
    setCatNameInput("");
    setModalOpen(true);
  }

  function openEditModal(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    setModalMode("edit");
    setEditCatId(catId);
    setSelectedIcon(cat.icon);
    setCatNameInput(cat.name);
    setModalOpen(true);
  }

  function confirmModal() {
    if (!catNameInput.trim()) { alert("カテゴリ名を入力してください"); return; }
    let next: Category[];
    if (modalMode === "add") {
      next = [...categories, { id: uid(), icon: selectedIcon, name: catNameInput.trim(), items: [] }];
    } else {
      next = categories.map((c) => c.id === editCatId ? { ...c, icon: selectedIcon, name: catNameInput.trim() } : c);
    }
    updateCategories(next);
    setModalOpen(false);
  }

  function addFromAI(aiCats: { icon: string; name: string; items: { label: string }[] }[]) {
    const newCats: Category[] = aiCats.map((ac) => ({
      id: uid(),
      icon: ac.icon,
      name: ac.name,
      items: ac.items.map((it) => ({ id: uid(), label: it.label, checked: false })),
    }));
    const next = [...categories, ...newCats];
    updateCategories(next);
  }

  if (!loaded) return <div className="loading">読み込み中...</div>;

  return (
    <>
      <div className="progress-wrap">
        <div className="progress-header">
          <span className="progress-label">チェック進捗</span>
          <span className="progress-count">{checkedItems} / {totalItems}</span>
        </div>
        <div className="progress-bar-bg">
          <div
            className={`progress-bar-fill${pct === 100 && totalItems > 0 ? " complete" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && totalItems > 0 && (
          <div className="complete-msg">✅ 準備完了！いってらっしゃい！</div>
        )}
      </div>

      <AIAdvisor onAddToChecklist={addFromAI} />

      {syncError && <div className="sync-error">{syncError}</div>}
      {syncing && <div className="sync-status">☁️ 同期中...</div>}

      <div className="top-actions">
        <button className="btn-reset" onClick={resetAll}>チェックをリセット</button>
        <button className="btn-add-cat" onClick={openAddModal}>＋ カテゴリを追加</button>
      </div>

      <div id="categoriesContainer">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            onToggle={toggleItem}
            onAddItem={addItem}
            onDeleteItem={deleteItem}
            onEdit={() => openEditModal(cat.id)}
            onDelete={() => deleteCat(cat.id)}
          />
        ))}
      </div>

      {!session?.user && (
        <div className="login-prompt-bar">
          💡 ログインするとデータがクラウドに保存されます
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-overlay open"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="modal">
            <h2>{modalMode === "add" ? "カテゴリを追加" : "カテゴリを編集"}</h2>
            <div className="icon-picker">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  className={`icon-btn${selectedIcon === icon ? " selected" : ""}`}
                  onClick={() => setSelectedIcon(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={catNameInput}
              onChange={(e) => setCatNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmModal()}
              placeholder="カテゴリ名（例：財布・鍵）"
              maxLength={20}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalOpen(false)}>キャンセル</button>
              <button className="btn-confirm" onClick={confirmModal}>
                {modalMode === "add" ? "追加" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CardProps {
  cat: Category;
  onToggle: (catId: string, itemId: string, checked: boolean) => void;
  onAddItem: (catId: string, label: string) => void;
  onDeleteItem: (catId: string, itemId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryCard({ cat, onToggle, onAddItem, onDeleteItem, onEdit, onDelete }: CardProps) {
  const [newLabel, setNewLabel] = useState("");

  function handleAdd() {
    if (!newLabel.trim()) return;
    onAddItem(cat.id, newLabel);
    setNewLabel("");
  }

  return (
    <div className="category-card">
      <div className="category-header">
        <div className="category-name">
          <span className="icon">{cat.icon}</span>
          <span>{cat.name}</span>
          <span className="category-count">
            {cat.items.filter((i) => i.checked).length}/{cat.items.length}
          </span>
        </div>
        <div className="category-actions">
          <button className="btn-rename-cat" onClick={onEdit}>編集</button>
          <button className="btn-delete-cat" onClick={onDelete}>削除</button>
        </div>
      </div>
      <ul className="item-list">
        {cat.items.map((item) => (
          <li key={item.id} className={item.checked ? "checked" : ""}>
            <div className="checkbox-wrap">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => onToggle(cat.id, item.id, e.target.checked)}
              />
            </div>
            <span className="item-label">{item.label}</span>
            <button className="btn-delete-item" onClick={() => onDeleteItem(cat.id, item.id)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="add-item-form">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="アイテムを追加"
          maxLength={30}
        />
        <button className="btn-add-item" onClick={handleAdd}>追加</button>
      </div>
    </div>
  );
}
