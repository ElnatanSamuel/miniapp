import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        connected: false,
        error: "BOT_TOKEN is not configured in .env",
      },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json(
        {
          connected: false,
          error: data.description || "Failed to connect to Telegram Bot API",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      connected: true,
      bot: {
        id: data.result.id,
        username: data.result.username,
        firstName: data.result.first_name,
        hasMainWebApp: data.result.has_main_web_app ?? false,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Network error contacting Telegram API";
    return NextResponse.json(
      {
        connected: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
