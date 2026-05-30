import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ai_advice_history")
    .select("id, situation, advice, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ history: data ?? [] });
}
