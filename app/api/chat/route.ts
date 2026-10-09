import type { MessageParam } from "@app/lib/chatTypes";
import { BadRequest, fakeChat } from "./fake";

// TEMPORARY: serves the scripted Stage 1 interview (./fake.ts) until step 6's route replaces it.
// Next answers any other method with a 405.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  if (!body || !Array.isArray(body.messages)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    return Response.json(fakeChat(body.messages as MessageParam[]));
  } catch (error) {
    if (error instanceof BadRequest) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    throw error;
  }
}
