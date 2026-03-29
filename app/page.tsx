import { redirect } from "next/navigation";
import { LandingHero } from "@/components/landing/hero";
import { getServerSession } from "@/lib/server-session";

export default async function Home() {
  const session = await getServerSession();

  if (session.user) {
    redirect("/boards");
  }

  return <LandingHero />;
}
