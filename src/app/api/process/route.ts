import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import { Receiver } from "@upstash/qstash";

// Allow up to 60 seconds for AI processing
export const maxDuration = 60;

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CLAUDE_PROMPT = `다음 웹페이지 내용을 분석해주세요.

1. summary: 핵심 내용 2-3문장 요약 (한국어)
2. category: 반드시 다음 중 하나 선택
   - "tech" (기술/개발/IT)
   - "news" (뉴스/시사)
   - "shopping" (쇼핑/제품)
   - "event" (이벤트/행사/공연)
   - "other" (그 외)
3. detected_date: 페이지 내 마감일, 행사일, 등록 마감 등 미래 날짜가 있으면
   "YYYY-MM-DD" 형식으로 반환. 없으면 null.
   - 게재일/발행일은 해당 안 됨
   - 명확한 미래 날짜만 추출

JSON으로만 응답: {"summary":"...","category":"...","detected_date":"..."|null}`;

export async function POST(req: NextRequest) {
  // Verify QStash signature
  const signature = req.headers.get("upstash-signature");
  const body = await req.text();

  if (signature) {
    try {
      await receiver.verify({ signature, body, url: `${process.env.NEXT_PUBLIC_APP_URL}/api/process` });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const { item_id, url } = JSON.parse(body);
  const supabase = createServiceClient();

  // Idempotency guard
  const { data: item } = await supabase
    .from("items")
    .select("status")
    .eq("id", item_id)
    .single();

  if (!item || item.status === "processed") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    // Fetch page content via Jina.ai Reader API
    let content = "";
    let title = "";

    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: "text/markdown", "X-Return-Format": "markdown" },
        signal: AbortSignal.timeout(15000),
      });
      const markdown = await jinaRes.text();

      // Extract title from first line (Jina returns # Title as first line)
      const firstLine = markdown.split("\n")[0];
      if (firstLine.startsWith("# ")) {
        title = firstLine.slice(2).trim();
      }
      // Limit content to ~4000 chars to keep Claude costs low
      content = markdown.slice(0, 4000);
    } catch {
      // Fallback: just use the URL
      content = `URL: ${url}\n(페이지 내용을 가져올 수 없습니다. URL만으로 분석해주세요.)`;
    }

    // Call Claude Haiku
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `${CLAUDE_PROMPT}\n\n[페이지 내용]\n${content}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const result = JSON.parse(responseText);

    // Update item with AI results
    await supabase
      .from("items")
      .update({
        title: title || null,
        summary: result.summary,
        category: result.category,
        detected_date: result.detected_date || null,
        status: "processed",
      })
      .eq("id", item_id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Mark as error
    await supabase
      .from("items")
      .update({ status: "error" })
      .eq("id", item_id);

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
