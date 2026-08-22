import type { User } from "@supabase/supabase-js";

let mockOrgs = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Sreenidhi Institute of Science and Technology",
    slug: "snist",
    type: "SEMI_PUBLIC",
    email_domain: "sreenidhi.edu.in",
    join_code: "SNIST",
    config: {
      retention_days: 30,
      verification_mode: "SELF_SERVE",
      disclosure: "REDACTED_CARD",
      match_threshold: 0.62,
      auto_approve_threshold: 0.85,
      contest_window_hours: 24,
      pickup_window_hours: 48,
      always_escalate_categories: ["phone", "laptop", "wallet", "documents", "jewellery"],
      federation_group: null,
      require_id_at_handover: false
    }
  },
  // Public venues, mirroring supabase/seed.sql — these drive the
  // "Popular nearby" quick links on the home page.
  { id: "00000000-0000-0000-0000-000000000011", name: "Hyderabad Metro", slug: "hyd-metro", type: "PUBLIC", config: {} },
  { id: "00000000-0000-0000-0000-000000000012", name: "Secunderabad Railway Station", slug: "secunderabad-rail", type: "PUBLIC", config: {} },
  { id: "00000000-0000-0000-0000-000000000013", name: "Rajiv Gandhi International Airport", slug: "rgia", type: "PUBLIC", config: {} },
  { id: "00000000-0000-0000-0000-000000000014", name: "MGBS Bus Terminal", slug: "mgbs", type: "PUBLIC", config: {} }
] as any[];

let mockMemberships: any[] = [];

class MockSupabaseQueryBuilder {
  private table: string;
  private data: any[];

  constructor(table: string, data: any[]) {
    this.table = table;
    this.data = [...data];
  }

  select(columns?: string) {
    return this;
  }

  ilike(column: string, value: string) {
    const cleanVal = value.replace(/%/g, "").toLowerCase();
    this.data = this.data.filter(item => {
      const val = item[column];
      return typeof val === "string" && val.toLowerCase().includes(cleanVal);
    });
    return this;
  }

  eq(column: string, value: any) {
    this.data = this.data.filter(item => item[column] === value);
    return this;
  }

  order(column: string, options?: any) {
    this.data.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (typeof valA === "string" && typeof valB === "string") {
        return valA.localeCompare(valB);
      }
      return 0;
    });
    return this;
  }

  limit(count: number) {
    this.data = this.data.slice(0, count);
    return this;
  }

  async single() {
    return { data: this.data[0] || null, error: this.data[0] ? null : { message: "Not found", code: "PGRST116" } };
  }

  async insert(row: any) {
    if (this.table === "memberships") {
      mockMemberships.push(row);
    }
    return { data: row, error: null };
  }

  then(onfulfilled?: (value: { data: any[] | null; error: any }) => any) {
    const promise = Promise.resolve({ data: this.data, error: null });
    return promise.then(onfulfilled);
  }
}

export const mockSupabaseClient = {
  auth: {
    async getUser() {
      return { data: { user: { id: "00000000-0000-0000-0000-000000000000", email: "dummy@example.com" } as User }, error: null };
    },
    async signInWithOtp(args: any) {
      return { data: {}, error: null };
    },
    async verifyOtp(args: any) {
      return { data: {}, error: null };
    }
  },
  from(table: string) {
    if (table === "orgs") {
      return new MockSupabaseQueryBuilder("orgs", mockOrgs);
    }
    if (table === "memberships") {
      // Hydrate the `orgs(...)` nested select the home page relies on.
      const rows = mockMemberships.map((m) => ({ ...m, orgs: mockOrgs.find((o) => o.id === m.org_id) ?? null }));
      return new MockSupabaseQueryBuilder("memberships", rows);
    }
    return new MockSupabaseQueryBuilder(table, []);
  },
  storage: {
    from(bucket: string) {
      return {
        createSignedUrl: async (path: string, ttl: number) => {
          return { data: { signedUrl: `https://example.com/mock-signed-url/${path}` }, error: null };
        }
      };
    }
  }
};
