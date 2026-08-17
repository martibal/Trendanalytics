import { redirect } from "next/navigation";

export const metadata = {
  title: "Urd Atlas",
  description: "Canonical responsive Urd Atlas homepage.",
};

export default function MobilePage() {
  redirect("/");
}