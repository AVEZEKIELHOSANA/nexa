"use server";

import { revalidatePath } from "next/cache";
import { assertAccessLevel } from "@/lib/auth-guards";
import { fail, ok, type ActionResult } from "@/lib/action";
import { isUuid } from "@/lib/pagination";
import { listMessages, markConversationRead, sendMessage } from "@/lib/data/messages";
import { MESSAGE_MAX, type Message } from "@/lib/messages";

/**
 * Server Actions of the conversation thread. Every one re-checks the signed-in user; the database
 * policies then decide whether this person belongs to this conversation at all.
 */

export async function sendMessageAction(requestId: string, body: string): Promise<ActionResult<{ message: Message }>> {
  try {
    const me = await assertAccessLevel("student", "professional");
    if (!isUuid(requestId)) throw new Error("Unknown conversation.");
    const text = body.trim();
    if (!text) throw new Error("Write a message first.");
    if (text.length > MESSAGE_MAX) throw new Error(`Messages are limited to ${MESSAGE_MAX} characters.`);
    const message = await sendMessage(requestId, me.id, text);
    return ok({ message });
  } catch (e) {
    return fail(friendly(e));
  }
}

export async function loadEarlierMessagesAction(requestId: string, before: string): Promise<ActionResult<{ messages: Message[]; hasMore: boolean }>> {
  try {
    await assertAccessLevel("student", "professional");
    if (!isUuid(requestId) || Number.isNaN(Date.parse(before))) throw new Error("Unknown conversation.");
    return ok(await listMessages(requestId, { before }));
  } catch (e) {
    return fail(e);
  }
}

/** Used when the tab regains focus, to catch anything a dropped live connection missed. */
export async function loadLatestMessagesAction(requestId: string): Promise<ActionResult<{ messages: Message[] }>> {
  try {
    await assertAccessLevel("student", "professional");
    if (!isUuid(requestId)) throw new Error("Unknown conversation.");
    const { messages } = await listMessages(requestId);
    return ok({ messages });
  } catch (e) {
    return fail(e);
  }
}

export async function markConversationReadAction(requestId: string): Promise<ActionResult> {
  try {
    const me = await assertAccessLevel("student", "professional");
    if (!isUuid(requestId)) throw new Error("Unknown conversation.");
    await markConversationRead(requestId, me.id);
    // The thread keeps its own state, so only refresh the navbar counters and the inbox.
    revalidatePath("/messages");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

function friendly(e: unknown): unknown {
  const code = typeof e === "object" && e ? (e as { code?: string }).code : undefined;
  if (code === "42501") return new Error("You can no longer send messages in this conversation.");
  return e;
}
