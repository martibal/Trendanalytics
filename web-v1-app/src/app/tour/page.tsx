import type { Metadata } from "next";

import UrdAtlasTourClient from "@/components/tour/UrdAtlasTourClient";

export const metadata: Metadata = {
  title: "How Urd Atlas works — Urd Atlas",
  description:
    "A beginner and analyst explanation of how Urd Atlas turns public blockchain activity into Gold, Derived, Meta, and Briefs JSON.",
};

export default function TourPage() {
  return <UrdAtlasTourClient />;
}
