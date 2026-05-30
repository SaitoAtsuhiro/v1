import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authOptions } from "@/lib/authOptions";
import { createAdminClient } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { situation } = await req.json();
  if (!situation?.trim()) {
    return NextResponse.json({ error: "状況を入力してください" }, { status: 400 });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const prompt = `あなたは持ち物リストのアドバイザーです。
ユーザーが「${situation}」という状況を教えてくれました。
この状況に持っていくべき持ち物を提案してください。

必ず以下のJSON形式のみで回答してください（コードブロックは不要）:
{
  "advice": "この状況についての簡単なアドバイス（2-3文）",
  "categories": [
    {
      "name": "カテゴリ名",
      "icon": "絵文字1文字",
      "items": ["アイテム1", "アイテム2", "アイテム3"]
    }
  ]
}

注意: カテゴリは2〜4個、各カテゴリのアイテムは3〜6個にしてください。`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid JSON response");
      parsed = JSON.parse(match[0]);
    }

    const userId = (session.user as { id?: string }).id;
    if (userId) {
      const supabase = createAdminClient();
      await supabase.from("ai_advice_history").insert({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        user_id: userId,
        situation,
        advice: JSON.stringify(parsed),
      });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("AI advice error:", message);
    return NextResponse.json(
      { error: `AIアドバイスの取得に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
