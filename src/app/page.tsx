"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Item, Category, CATEGORY_LABELS } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import type { User } from "@supabase/supabase-js";

const ALL_CATEGORIES: Category[] = ["tech", "news", "shopping", "event", "other"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category | "all">("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchItems();
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchItems();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("saved_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  }

  async function handleLogin() {
    const email = prompt("이메일 주소를 입력하세요");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert("오류가 발생했습니다: " + error.message);
      return;
    }
    alert("이메일을 확인해주세요. 로그인 링크를 보냈습니다.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setItems([]);
  }

  const filteredItems =
    filter === "all"
      ? items
      : items.filter((item) => item.category === filter);

  const unreadCount = items.filter((item) => !item.opened_at).length;

  // Not logged in
  if (!user && !loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">recall-ai</h1>
          <p className="mt-3 text-lg text-gray-500">
            링크를 저장하면 AI가 알아서 정리합니다
          </p>
          <button
            onClick={handleLogin}
            className="mt-8 rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            이메일로 시작하기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">recall-ai</h1>
          <p className="text-sm text-gray-500">
            {items.length}개 저장됨 · {unreadCount}개 미열람
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          로그아웃
        </button>
      </div>

      {/* Category filter */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1 text-sm transition ${
            filter === "all"
              ? "bg-gray-900 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          전체 ({items.length})
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm transition ${
                filter === cat
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="py-20 text-center text-gray-400">로딩 중...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            {items.length === 0
              ? "아직 저장된 링크가 없어요. 익스텐션으로 링크를 저장해보세요!"
              : "이 카테고리에 저장된 링크가 없어요."}
          </div>
        ) : (
          filteredItems.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </main>
  );
}
