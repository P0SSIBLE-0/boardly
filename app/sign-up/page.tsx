import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { getServerSession } from "@/lib/server-session";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const session = await getServerSession();
  const { redirectTo } = await searchParams;

  if (session.user) {
    redirect("/boards");
  }

  return <AuthCard mode="sign-up" redirectTo={redirectTo} />;
}
