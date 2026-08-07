import { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

export function InteractiveFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does SiteCraft differ from generic AI website builders?",
      a: "Traditional AI website builders use simple text templates. SiteCraft coordinates an autonomous swarm of 18 specialized AI agents (UX Strategist, Copywriter, Framer Motion Designer, SEO Auditor, and Edge Deployer) that synthesize modular React components from scratch.",
    },
    {
      q: "Can I export the full React / Next.js source code?",
      a: "Yes! Every project can be exported as a full ZIP containing standard React components with Tailwind CSS styling and WAI-ARIA accessibility attributes. No lock-in.",
    },
    {
      q: "How does custom domain deployment work?",
      a: "SiteCraft includes a built-in enterprise DNS verification suite. You can connect your domain via CNAME, A, or TXT records with automated wildcard SSL certificates issued instantly.",
    },
    {
      q: "What deployment targets are supported out of the box?",
      a: "We support direct 1-click deployments to Vercel, Netlify, GitHub Pages, Cloudflare, FTP/SFTP servers, and AWS S3.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-24 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
          <HelpCircle className="h-3.5 w-3.5" /> FREQUENTLY ASKED QUESTIONS
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Everything you need to know.
        </h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={faq.q}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className={`p-6 rounded-2xl glass border transition-all cursor-pointer ${
                isOpen ? "border-primary/50 bg-primary/5 shadow-xl" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-foreground">{faq.q}</h3>
                <ChevronDown className={`h-5 w-5 text-primary shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </div>
              {isOpen && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed animate-fade-in">
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
