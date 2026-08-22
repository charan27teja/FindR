import test from "node:test";
import assert from "node:assert/strict";
import {
  eventPrice,
  EVENT_BASE_FEE_INR,
  NewEvent,
  NewOrg,
  OrgContact,
  slugify,
} from "@findr/shared";

test("price is base fee plus per-head", () => {
  assert.equal(eventPrice(100), 1500);
  assert.equal(eventPrice(500), 5500);
  assert.equal(eventPrice(1), EVENT_BASE_FEE_INR + 10);
  // No capacity means no event, so no base fee either — otherwise an empty
  // form shows ₹500 before anything has been typed.
  assert.equal(eventPrice(0), 0);
  assert.equal(eventPrice(-5), 0);
  assert.equal(eventPrice(Number.NaN), 0);
});

test("a contact needs an email or a phone, not both", () => {
  assert.ok(OrgContact.safeParse({ email: "desk@snist.edu", phone: "" }).success);
  assert.ok(OrgContact.safeParse({ email: "", phone: "9876543210" }).success);
  assert.ok(!OrgContact.safeParse({ email: "", phone: "" }).success, "empty contact");
  assert.ok(!OrgContact.safeParse({ email: "not-an-email", phone: "" }).success, "bad email");
});

test("an org needs a name, a location and at least one contact", () => {
  const ok = {
    name: "Sreenidhi Institute",
    location: "Yamnampet, Hyderabad",
    contacts: [{ email: "desk@snist.edu", phone: "" }],
  };
  assert.ok(NewOrg.safeParse(ok).success);
  assert.ok(!NewOrg.safeParse({ ...ok, contacts: [] }).success, "no contacts");
  assert.ok(
    !NewOrg.safeParse({ ...ok, contacts: Array(4).fill(ok.contacts[0]) }).success,
    "more than three contacts",
  );
});

test("an event must end after it starts", () => {
  const ok = {
    name: "Techfusion",
    event_date: "2026-09-01",
    starts_at: "09:00",
    ends_at: "17:00",
    capacity: "250",
  };
  const parsed = NewEvent.safeParse(ok);
  assert.ok(parsed.success);
  assert.equal(parsed.data.capacity, 250, "capacity coerces from the form string");
  assert.ok(!NewEvent.safeParse({ ...ok, ends_at: "08:00" }).success, "ends before it starts");
  assert.ok(!NewEvent.safeParse({ ...ok, capacity: "0" }).success, "zero capacity");
});

test("slug is url-safe and never empty", () => {
  assert.equal(slugify("Sreenidhi Institute of Science & Tech"), "sreenidhi-institute-of-science-tech");
  assert.equal(slugify("!!!"), "org");
});
