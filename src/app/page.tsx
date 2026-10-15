import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_COOKIE_NAME } from "@/lib/auth-guard";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  const cookieStore = cookies();
  const hasCompletedOnboarding =
    cookieStore.get(ONBOARDING_COOKIE_NAME)?.value === "true";

  if (hasCompletedOnboarding) {
    redirect("/login");
  }

  redirect("/splash");
}
