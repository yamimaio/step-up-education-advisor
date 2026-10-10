import { NextResponse } from "next/server";
import { loadPrograms } from "@core/index";
import { chatLoop } from "@server/chatLoop";
import { BadRequest } from "@server/handlers";
import { MAX_BODY_BYTES } from "@server/limits";
import type { ModelClient } from "@server/model/adapter";
import { createAnthropicClient } from "@server/model/anthropic";
import { FakeModelClient } from "@server/model/fake";
import { personaAScript } from "@server/model/personaA";
import { parseChatRequest } from "@server/requestSchema";

// POST /api/chat (docs/chat-api.md). Errors never echo the request: the body is the user's words.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const badRequest = () => NextResponse.json({ error: "bad_request" }, { status: 400 });
const notAllowed = () =>
  NextResponse.json({ error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });

// MODEL_FAKE=1 serves persona A's scripted advisor, for local page work without spend (DQ17).
function modelClient(): ModelClient {
  return process.env.MODEL_FAKE === "1"
    ? new FakeModelClient(personaAScript)
    : createAnthropicClient();
}

async function readBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return undefined;
  // Read in chunks and stop at the limit, so a body without a length can't fill memory.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const messages = parseChatRequest(await readBody(request));
  if (!messages) return badRequest();
  try {
    const response = await chatLoop(messages, { model: modelClient(), programs: loadPrograms() });
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof BadRequest) return badRequest();
    throw error;
  }
}

export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
