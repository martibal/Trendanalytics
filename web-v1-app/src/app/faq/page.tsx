import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import QaPageClient from "@/components/qa/QaPageClient";
import { qaEntries, qaCategories } from "@/lib/qa";

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Q&A"
        title="Questions skeptics ask"
        highlight="before they trust the output."
        summary="Practical and technical answers about noise, regime change, confidence, baselines, JSON artifacts, and traceability."
      >
        <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-white/78">
          <span>{qaEntries.length} answers</span>
          <span>·</span>
          <span>{qaCategories.length} categories</span>
          <span>·</span>
          <span>Basic and Advanced explanation levels</span>
          <span>·</span>
          <span>Expected refresh windows: around 09:00 and 21:00 Europe/Oslo</span>
        </div>
      </PageHero>

      <div
        className={[
          "faq-contrast-panel mx-auto max-w-6xl px-6 py-10",
          "[&_section]:border-[#b6cce3]",
          "[&_section]:bg-[#e7f1fb]",
          "[&_section_h2]:text-[#0d2447]",
          "[&_section_h2]:font-black",
          "[&_section_p]:text-[#27476f]",
          "[&_section_li]:text-[#27476f]",
          "[&_button]:text-[#0d2447]",
          "[&_button:hover]:bg-[#dceaf8]",
          "[&_input]:border-[#9db8d4]",
          "[&_input]:bg-white",
          "[&_input]:text-[#0d2447]",
          "[&_select]:border-[#9db8d4]",
          "[&_select]:bg-white",
          "[&_select]:text-[#0d2447]",
          "[&_code]:!rounded",
          "[&_code]:!border",
          "[&_code]:!border-[#9db8d4]",
          "[&_code]:!bg-[#f4f9ff]",
          "[&_code]:!px-1.5",
          "[&_code]:!py-0.5",
          "[&_code]:!font-mono",
          "[&_code]:!text-xs",
          "[&_code]:!font-bold",
          "[&_code]:!text-[#0d2447]",
          "[&_.rounded-3xl]:!border-[#9db8d4]",
          "[&_.rounded-3xl]:!bg-[#e7f1fb]",
          "[&_.rounded-3xl_*]:!text-[#0d2447]",

          "[&_.rounded-2xl]:!border-[#9db8d4]",
          "[&_.rounded-2xl]:!bg-[#031329]",
          "[&_.rounded-2xl_h2]:!text-white",
          "[&_.rounded-2xl_h3]:!text-white",
          "[&_.rounded-2xl_p]:!text-white",
          "[&_.rounded-2xl_span]:!text-blue-300",

          "[&_.rounded-xl]:!border-white/15",
          "[&_.rounded-xl]:!bg-white/10",
          "[&_.rounded-xl_*]:!text-white",

          "[&_button]:!border-[#9db8d4]",
          "[&_button]:!text-[#0d2447]",
          "[&_button:hover]:!bg-[#dceaf8]",
          "[&_button[aria-pressed='true']]:!bg-blue-700",
          "[&_button[aria-pressed='true']]:!text-white",
          "[&_p.rounded-xl]:!text-white",
          "[&_p.rounded-2xl]:!text-white",
          "[&_div.rounded-xl]:!text-white",
          "[&_div.rounded-2xl]:!text-white",
          "[&_p.rounded-xl_*]:!text-white",
          "[&_p.rounded-2xl_*]:!text-white",
          "[&_div.rounded-xl_*]:!text-white",
          "[&_div.rounded-2xl_*]:!text-white",
          "[&_[role='tab']]:!text-white",
          "[&_[role='tab'][aria-selected='false']]:!text-white",
          "[&_[aria-pressed='false']]:!text-white",
        ].join(" ")}
      >

        <style>
          {`
            .faq-contrast-panel .rounded-xl,
            .faq-contrast-panel .rounded-xl *,
            .faq-contrast-panel .rounded-2xl .rounded-xl,
            .faq-contrast-panel .rounded-2xl .rounded-xl * {
              color: #ffffff !important;
            }

            .faq-contrast-panel .rounded-xl {
              background: #031329 !important;
              border-color: rgba(147, 197, 253, 0.28) !important;
            }
          `}
        </style>

        <ShortFullContent
          pageKey="faq"
          summary={
            <>
              Use this page when you want short answers to the skeptical
              questions a serious buyer would ask before trusting the product.
            </>
          }
          bullets={[
            <>
              The Q&amp;A covers noise vs regime change, confidence, baselines,
              JSON artifacts, and trust signals.
            </>,
            <>
              Start with the short answer. Expand only the questions you
              actually care about.
            </>,
            <>
              Basic and Advanced explanation levels remain available inside the
              full answers.
            </>,
          ]}
          whyItMatters={
            <>
              The page should feel fast and scannable for new users, without
              removing technical answers for skeptical readers.
            </>
          }
          fullContent={<QaPageClient />}
        />
      </div>
    </main>
  );
}