import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = process.env.BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "BOT_TOKEN is not configured in .env" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { chatId, text, parseMode = "HTML" } = body;

    if (!chatId || !text) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: chatId and text" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      },
    );

    const data = await res.json();

    if (!data.ok) {
      // Telegram error (e.g. user hasn't /started the bot or blocked it)
      return NextResponse.json({
        ok: false,
        delivered: false,
        errorCode: data.error_code,
        description: data.description,
      });
    }

    return NextResponse.json({
      ok: true,
      delivered: true,
      messageId: data.result.message_id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error sending Telegram DM";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
