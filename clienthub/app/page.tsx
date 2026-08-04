import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role === "owner") redirect("/console");
  redirect(`/c/${s.slug}`);
}
