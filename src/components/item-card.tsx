"use client";

import { Item, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const isProcessing = item.status === "pending";
  const isError = item.status === "error";
  const isUnread = !item.opened_at;

  const handleClick = () => {
    window.open(item.url, "_blank");
    // Mark as opened via API (fire-and-forget)
    fetch(`/api/open?id=${item.id}`, { method: "GET" }).catch(() => {});
  };

  return (
    <div
      onClick={handleClick}
      className={`group cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
        isUnread ? "border-l-4 border-l-blue-500 bg-white" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title */}
          <h3 className="truncate font-medium text-gray-900 group-hover:text-blue-600">
            {item.title || new URL(item.url).hostname}
          </h3>

          {/* URL */}
          <p className="mt-0.5 truncate text-xs text-gray-400">{item.url}</p>

          {/* Summary */}
          {isProcessing && (
            <p className="mt-2 text-sm text-gray-400">AI 처리 중...</p>
          )}
          {isError && (
            <p className="mt-2 text-sm text-red-400">처리 실패</p>
          )}
          {item.summary && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              {item.summary}
            </p>
          )}
        </div>

        {/* Category badge */}
        {item.category && (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              CATEGORY_COLORS[item.category]
            }`}
          >
            {CATEGORY_LABELS[item.category]}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        <span>{new Date(item.saved_at).toLocaleDateString("ko-KR")}</span>
        {item.detected_date && (
          <span className="text-orange-500">
            📅 {item.detected_date}
          </span>
        )}
        {isUnread && (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
            미열람
          </span>
        )}
      </div>
    </div>
  );
}
