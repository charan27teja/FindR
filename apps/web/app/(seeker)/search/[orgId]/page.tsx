import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import DescribeItemClient from "./DescribeItemClient";

export default async function SearchOrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ report?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { orgId } = await params;
  const { report, error } = await searchParams;

  const supabase = await db();
  const { data: org } = await supabase
    .from("orgs")
    .select("id,name,slug,type")
    .eq("id", orgId)
    .single();
  if (!org) notFound();

  return (
    <DescribeItemClient
      orgId={org.id as string}
      orgName={org.name as string}
      isReport={report === "1"}
      error={error}
    />
  );
}
