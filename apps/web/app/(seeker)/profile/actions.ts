"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";

export async function signOut() {
  const supabase = await db();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfile(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!firstName) {
    throw new Error("First name is required.");
  }

  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  const supabase = await db();
  await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      address,
      phone,
    },
  });

  revalidatePath("/profile");
}

export async function uploadAvatar(formData: FormData): Promise<string> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) throw new Error("No file provided");

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `avatars/${user.id}.${ext}`;

  // Upload to Supabase Storage (upsert to overwrite previous avatar)
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    // If the bucket doesn't exist yet, save the avatar as a data URL in user metadata instead
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
    revalidatePath("/profile");
    return dataUrl;
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = publicUrlData.publicUrl;

  await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
  revalidatePath("/profile");
  return avatarUrl;
}
