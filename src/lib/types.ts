export type ItemStatus = "pending" | "processed" | "error";
export type Category = "tech" | "news" | "shopping" | "event" | "other";

export interface Item {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  summary: string | null;
  category: Category | null;
  detected_date: string | null;
  status: ItemStatus;
  saved_at: string;
  opened_at: string | null;
  reminded_date_at: string | null;
  reminded_nudge_at: string | null;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  tech: "테크",
  news: "뉴스",
  shopping: "쇼핑",
  event: "이벤트",
  other: "기타",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  tech: "bg-blue-100 text-blue-700",
  news: "bg-purple-100 text-purple-700",
  shopping: "bg-green-100 text-green-700",
  event: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};
