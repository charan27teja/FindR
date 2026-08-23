/**
 * Outbound mail, and the one message Findr currently sends.
 *
 * No `server-only` guard here on purpose: the composer below is a pure
 * function with a unit test, and `server-only` throws under `node --test`.
 * Nothing leaks by leaving it off — RESEND_API_KEY has no NEXT_PUBLIC_ prefix,
 * so Next replaces it with undefined in any client bundle rather than inlining
 * it, and sendEmail is only ever called from a server action.
 */

/** What the desk needs to see about the item that was claimed. */
export type ClaimedItemSummary = {
  id: string;
  org_id: string;
  short_code: string | null;
  category: string | null;
  colour: string | null;
  public_description: string | null;
};

export type Contact = { name: string | null; email: string | null; phone: string | null };

/**
 * The mail an organiser gets when someone claims an item they logged.
 *
 * Pure, so it can be read and tested without a mail server. Every field falls
 * back rather than disappearing: an organiser scanning this on a phone at a
 * desk should be able to tell "no phone number on file" from a formatting bug.
 */
export function claimNotificationEmail(
  item: ClaimedItemSummary,
  claimant: Contact,
  origin: string,
): { subject: string; text: string } {
  const label =
    [item.colour, item.category].filter(Boolean).join(" ") || item.public_description || "an item";
  const code = item.short_code ?? item.id;

  return {
    subject: `Claim on ${code} — ${label}`,
    text: [
      "Someone has claimed an item you logged on Findr.",
      "",
      "ITEM",
      `  Code:        ${code}`,
      `  Description: ${item.public_description ?? label}`,
      "",
      "CLAIMED BY",
      `  Name:  ${claimant.name ?? "Not given"}`,
      `  Email: ${claimant.email ?? "Not given"}`,
      `  Phone: ${claimant.phone ?? "Not given"}`,
      "",
      "Review the claim and settle it here:",
      `  ${origin}/orgs/${item.org_id}`,
      "",
      "Do not hand the item over on the strength of this email alone — verify",
      "the claimant at the desk first.",
    ].join("\n"),
  };
}

/**
 * The mail someone gets when an admin adds them as an organiser.
 *
 * Signing in is deliberately described rather than linked: Findr logs people
 * in with a one-time code sent to this address, so a link in this email would
 * be a second, confusingly different way in.
 */
export function organiserAddedEmail(
  orgName: string,
  orgId: string,
  origin: string,
): { subject: string; text: string } {
  return {
    subject: `You are now an organiser of ${orgName}`,
    text: [
      `An admin has added you as an organiser of ${orgName} on Findr.`,
      "",
      "You can now log found items at its desk, and review and settle claims:",
      `  ${origin}/orgs/${orgId}`,
      "",
      "Sign in at this address to get in — Findr emails you a one-time code, so",
      "there is no password to set up.",
      "",
      "If you were not expecting this, you can ignore it. Nothing happens to",
      "your address unless you sign in.",
    ].join("\n"),
  };
}

/**
 * Sends one transactional email through Resend.
 *
 * ponytail: fetch against the REST API rather than the `resend` package — one
 * POST is the entire surface we use. Add the SDK if attachments, batching or
 * webhook signature verification ever come up.
 *
 * Never throws, and returns false instead. Every caller is notifying somebody
 * *after* the thing the user actually asked for already succeeded, so a
 * missing key or a mail server having a bad day is worth a server log and
 * nothing more.
 */
export async function sendEmail(msg: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`RESEND_API_KEY is not set — not emailing ${msg.to}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      // Resend only accepts a verified sender; onboarding@resend.dev is the one
      // address that works before a domain has been set up in the dashboard.
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Findr <onboarding@resend.dev>",
        ...msg,
      }),
    });
    if (!res.ok) {
      console.error(`Resend refused the email (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (cause) {
    console.error("Could not reach Resend:", cause);
    return false;
  }
}
