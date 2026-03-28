import { NextRequest, NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const supabase = await createUserClient(authHeader);

  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Dedup: check if this URL already exists for this user
  const { data: existing } = await supabase
    .from("items")
    .select("id, status, summary, category")
    .eq("url", url)
    .single();

  if (existing) {
    return NextResponse.json({ item: existing, deduplicated: true });
  }

  // Insert new item with pending status
  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: user.id, url, status: "pending" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Queue background AI processing via QStash
  const qstashToken = process.env.QSTASH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (qstashToken && appUrl) {
    await fetch("https://qstash.upstash.io/v2/publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${qstashToken}`,
        "Content-Type": "application/json",
        "Upstash-Forward-Content-Type": "application/json",
        "Upstash-Retries": "3",
      },
      body: JSON.stringify({
        url: `${appUrl}/api/process`,
        body: JSON.stringify({ item_id: item.id, url }),
      }),
    });
  }

  return NextResponse.json({ item: { id: item.id, status: "pending" } });
}
