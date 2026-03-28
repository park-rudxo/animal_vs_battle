import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

// Vercel Cron: 매일 UTC 00:00 (KST 09:00)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const results = { dateReminders: 0, nudgeReminders: 0 };

  // 1. Date reminders: detected_date is 3 days from now
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const dateStr = threeDaysLater.toISOString().split("T")[0];

  const { data: dateItems } = await supabase
    .from("items")
    .select("id, user_id, url, title, summary, detected_date")
    .eq("detected_date", dateStr)
    .is("reminded_date_at", null);

  if (dateItems && dateItems.length > 0) {
    for (const item of dateItems) {
      await sendReminder(item, "date");
      await supabase
        .from("items")
        .update({ reminded_date_at: now.toISOString() })
        .eq("id", item.id);
      results.dateReminders++;
    }
  }

  // 2. Nudge reminders: saved 7+ days ago, never opened, never nudged
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: nudgeItems } = await supabase
    .from("items")
    .select("id, user_id, url, title, summary")
    .lt("saved_at", sevenDaysAgo.toISOString())
    .is("opened_at", null)
    .is("reminded_nudge_at", null)
    .eq("status", "processed");

  if (nudgeItems && nudgeItems.length > 0) {
    for (const item of nudgeItems) {
      await sendReminder(item, "nudge");
      await supabase
        .from("items")
        .update({ reminded_nudge_at: now.toISOString() })
        .eq("id", item.id);
      results.nudgeReminders++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}

async function sendReminder(
  item: { id: string; user_id: string; url: string; title: string | null; summary: string | null },
  type: "date" | "nudge"
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  // Get user email from Supabase auth
  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.getUserById(item.user_id);
  const email = data?.user?.email;
  if (!email) return;

  const subject =
    type === "date"
      ? `📅 [recall-ai] "${item.title || "저장한 링크"}" 마감이 3일 남았어요`
      : `📬 [recall-ai] "${item.title || "저장한 링크"}" 아직 안 열어봤어요`;

  const body =
    type === "date"
      ? `저장하신 링크에 마감일이 3일 뒤입니다.\n\n${item.title || item.url}\n${item.summary || ""}\n\n원본 보기: ${item.url}`
      : `일주일 전에 저장하셨는데 아직 확인 안 하셨어요.\n\n${item.title || item.url}\n${item.summary || ""}\n\n원본 보기: ${item.url}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "recall-ai <noreply@recall-ai.com>",
      to: email,
      subject,
      text: body,
    }),
  });
}
