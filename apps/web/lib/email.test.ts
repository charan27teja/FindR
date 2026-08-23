import test from "node:test";
import assert from "node:assert/strict";
import { claimNotificationEmail, organiserAddedEmail } from "./email.ts";

const ITEM = {
  id: "11111111-1111-1111-1111-111111111111",
  org_id: "22222222-2222-2222-2222-222222222222",
  short_code: "SNIST-4B7K",
  category: "umbrella",
  colour: "black",
  public_description: "A black folding umbrella",
};

test("the organiser gets the claimant's contact details and a link to the queue", () => {
  const mail = claimNotificationEmail(
    ITEM,
    { name: "Asha Rao", email: "asha@example.com", phone: "+91 90000 00000" },
    "https://findr.example",
  );

  assert.match(mail.subject, /SNIST-4B7K/);
  assert.match(mail.text, /Asha Rao/);
  assert.match(mail.text, /asha@example\.com/);
  assert.match(mail.text, /\+91 90000 00000/);
  assert.match(mail.text, /https:\/\/findr\.example\/orgs\/22222222-2222-2222-2222-222222222222/);
});

test("missing contact details say so rather than rendering as blanks", () => {
  const mail = claimNotificationEmail(ITEM, { name: null, email: null, phone: null }, "http://x");
  assert.equal(mail.text.match(/Not given/g)?.length, 3);
});

test("an item with no code or attributes still names itself", () => {
  const mail = claimNotificationEmail(
    { ...ITEM, short_code: null, category: null, colour: null, public_description: null },
    { name: null, email: null, phone: null },
    "http://x",
  );
  assert.match(mail.subject, /Claim on 11111111-1111-1111-1111-111111111111 — an item/);
});

test("a new organiser is told which organisation and where its console is", () => {
  const mail = organiserAddedEmail("SNIST", "22222222-2222-2222-2222-222222222222", "https://findr.example");

  assert.match(mail.subject, /organiser of SNIST/);
  assert.match(mail.text, /https:\/\/findr\.example\/orgs\/22222222-2222-2222-2222-222222222222/);
  assert.match(mail.text, /one-time code/);
});
