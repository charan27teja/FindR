import { requireUser } from "@/lib/auth";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const user = await requireUser();

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const firstName =
    user.user_metadata?.first_name ||
    fullName.split(" ")[0] ||
    "User";

  const lastName =
    user.user_metadata?.last_name ||
    (fullName.split(" ").length > 1 ? fullName.split(" ").slice(1).join(" ") : "");

  const email = user.email || "user@gmail.com";
  const address = user.user_metadata?.address || "Hyderabad, India";
  const phone = user.user_metadata?.phone || user.phone || "+91 98765 43210";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <ProfileClient
      initialData={{
        firstName,
        lastName,
        fullName,
        email,
        address,
        phone,
        avatarUrl,
      }}
    />
  );
}
