import ShortFullContent from "@/components/site/ShortFullContent";
import QaPageClient from "@/components/qa/QaPageClient";
import { qaEntries, qaCategories } from "@/lib/qa";
import PageHero from "@/components/site/PageHero";
import { UrdContainer, UrdPage } from "@/components/site/UrdDesignSystem";

export default function FaqPage() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="Q&A"
        title="Questions skeptics ask before they trust the output"
        summary="This page answers the practical and technical questions users are likely to ask about on-chain reference data, noise, regime change, confidence, baselines, JSON delivery, and traceability."
      >
        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <span>{qaEntries.length} answers</span>
          <span>·</span>
          <span>{qaCategories.length} categories</span>
          <span>·</span>
          <span>Basic and Advanced explanation levels</span>
          <span>·</span>
          <span>Expected refresh windows: around 09:00 and 21:00 Europe/Oslo</span>
        </div>
      </PageHero>
      <UrdContainer>
      <ShortFullContent
        pageKey="faq"
        summary={<>Use this page when you want short answers to the skeptical questions a serious buyer would ask before trusting the product.</>}
        bullets={[
          <>The Q&amp;A covers on-chain reference data, noise vs regime change, confidence, baselines, JSON delivery, and trust signals.</>,
          <>Start with the short answer. Expand only the questions you actually care about.</>,
          <>Basic and Advanced explanation levels remain available inside the full answers.</>,
        ]}
        whyItMatters={<>The page should feel fast and scannable for new users, without removing technical answers for skeptical readers.</>}
        fullContent={<QaPageClient />}
      />
      </UrdContainer>
    </UrdPage>
  );
}
