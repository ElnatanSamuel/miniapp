import { Bot } from "grammy";
import { env, maskToken } from "./env";
import { createLogger } from "./log";

const log = createLogger("bot");

const bot = new Bot(env.botToken);

const openShopKeyboard = {
  keyboard: [
    [{ text: "🛍 Open Shop", web_app: { url: env.tmaBaseUrl } }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

bot.command("start", (ctx) => {
  log.info(`/start from @${ctx.from?.username ?? ctx.from?.id} — sending Mini App keyboard`);
  return ctx.reply("TeleCommerce ET — tap the button below to open the shop.", {
    reply_markup: openShopKeyboard,
  });
});

bot.on("channel_post", async (ctx) => {
  const post = ctx.channelPost;
  const caption = post.caption || post.text || "";
  if (!caption) return;

  const chat = post.chat.title ?? String(post.chat.id);
  log.info(`channel_post #${post.message_id} in "${chat}" — injecting order button`);

  // web_app inline buttons are private-chat ONLY (Bot API) — channels need a
  // plain url button pointing at the main Mini App direct link instead.
  const deepLink = `https://t.me/${bot.botInfo.username}?startapp=p_demo`;

  try {
    await ctx.api.editMessageReplyMarkup(post.chat.id, post.message_id, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🛍 ይዘዙ / Order Now (2,400 ETB)",
              url: deepLink,
            },
          ],
        ],
      },
    });
    log.info(`button injected → "${chat}" post #${post.message_id} → ${deepLink}`);
  } catch (err) {
    const description = (err as { description?: string }).description ?? String(err);
    if (description.includes("not modified")) {
      log.info(`button already present on post #${post.message_id} — skipped`);
    } else if (description.includes("administrator") || description.includes("not enough rights")) {
      log.error(`could not edit post #${post.message_id}: ${description}`);
      log.error("hint: the bot must be an ADMIN of the channel to edit posts");
    } else {
      log.error(`could not edit post #${post.message_id}: ${description}`);
    }
  }
});

bot.catch((err) => {
  const description = (err.error as { description?: string }).description;
  if (description) {
    log.error(`telegram api: ${description}`);
  } else {
    log.error("handler error:", err.error);
  }
});

async function main(): Promise<void> {
  await bot.init();
  const me = bot.botInfo;
  log.info(`token ${maskToken(env.botToken)} · connected as @${me.username}`);
  log.info(`mini app url: ${env.tmaBaseUrl}`);
  log.info(`channel button → https://t.me/${me.username}?startapp=<productId>`);
  log.info("listening: /start · channel_post");
  await bot.start({ drop_pending_updates: true });
}

main().catch((err) => {
  log.error("fatal:", err);
  process.exit(1);
});
