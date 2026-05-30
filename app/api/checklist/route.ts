import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminClient } from "@/lib/supabase";

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>) {
  return (session?.user as { id?: string })?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: cats } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("order_index");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("order_index");

  const categories = (cats ?? []).map((cat) => ({
    id: cat.id,
    icon: cat.icon,
    name: cat.name,
    items: (items ?? [])
      .filter((i) => i.category_id === cat.id)
      .map((i) => ({ id: i.id, label: i.label, checked: i.checked })),
  }));

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createAdminClient();

  if (body.action === "save_all") {
    const { categories } = body;

    await supabase.from("items").delete().eq("user_id", userId);
    await supabase.from("categories").delete().eq("user_id", userId);

    if (categories.length > 0) {
      await supabase.from("categories").insert(
        categories.map((cat: { id: string; icon: string; name: string }, idx: number) => ({
          id: cat.id,
          user_id: userId,
          icon: cat.icon,
          name: cat.name,
          order_index: idx,
        }))
      );

      const allItems: {
        id: string;
        category_id: string;
        user_id: string;
        label: string;
        checked: boolean;
        order_index: number;
      }[] = [];
      categories.forEach((cat: { id: string; items: { id: string; label: string; checked: boolean }[] }) => {
        cat.items.forEach((item, idx) => {
          allItems.push({
            id: item.id,
            category_id: cat.id,
            user_id: userId,
            label: item.label,
            checked: item.checked,
            order_index: idx,
          });
        });
      });
      if (allItems.length > 0) await supabase.from("items").insert(allItems);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
