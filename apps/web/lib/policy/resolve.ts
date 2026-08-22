import { OrgConfig } from "@findr/shared";
import { db } from "@/lib/db/client";

/**
 * §7. The only place tenant behaviour is read. No threshold is inlined
 * anywhere else, and nothing branches on org name or slug.
 * Missing keys fall back to the documented defaults, so a half-filled
 * config row never crashes a request.
 */
export async function resolveConfig(orgId: string): Promise<OrgConfig> {
  const supabase = await db();
  const { data } = await supabase.from("orgs").select("config").eq("id", orgId).single();
  return OrgConfig.parse(data?.config ?? {});
}

export function autoApprovalAllowed(config: OrgConfig, category: string | null): boolean {
  if (config.verification_mode !== "SELF_SERVE") return false;
  // §10 escalation override: high-value categories always see a human.
  if (category && config.always_escalate_categories.includes(category.toLowerCase())) return false;
  return true;
}
