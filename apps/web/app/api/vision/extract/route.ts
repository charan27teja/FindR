import { NextResponse } from "next/server";
import { z } from "zod";
import { extractVision } from "@/lib/ai/vision";
import { rolesIn, STAFF_ROLES } from "@/lib/auth";

/**
 * §8 POST /vision/extract. Staff only — the response carries `private`, the
 * ownership-challenge answers, which no seeker may ever see (INV-1).
 */
const Body = z.object({
  image_b64: z.string().min(1),
  org_id: z.string().uuid(),
  mime_type: z.string().default("image/jpeg"),
  org_context: z.object({ node_name: z.string().optional() }).default({}),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const held = await rolesIn(body.data.org_id);
  if (!held.some((r) => STAFF_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await extractVision(body.data.image_b64, body.data.org_context, body.data.mime_type);
  // INV-6: a vision failure is a 200 with enrichment_status FAILED, never a
  // blocked intake. The caller saves the item either way.
  return result
    ? NextResponse.json(result)
    : NextResponse.json({ enrichment_status: "FAILED" }, { status: 200 });
}
