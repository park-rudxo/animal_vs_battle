import { NextRequest, NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

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

  // Ownership check + get URL (RLS already filters by user_id)
  const { data: item } = await supabase
    .from("items")
    .select("url")
    .eq("id", id)
    .single();

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update opened_at
  await supabase
    .from("items")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", id);

  // Redirect to original URL
  return NextResponse.redirect(item.url);
}
