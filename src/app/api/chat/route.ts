import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { message, company, auditResult, aiVisResult, history } = await req.json();

    const anthropic = new Anthropic();

    // Build context from available data
    let context = `You are CabbageSEO, an AI marketing assistant specialized in Indian residential real estate developers. You help marketing heads and owners improve their digital presence, SEO rankings, AI visibility (GEO), and lead generation.

Be practical, specific, and tie every recommendation to business impact (more enquiries, better rankings, lower CAC). Use Indian real estate terminology naturally (RERA, possession, OC, CC, EMI, NRI buyers, etc.).

## Company Context
`;

    if (company?.name) {
      context += `Company: ${company.name}\n`;
      context += `City: ${company.city}\n`;
      if (company.website) context += `Website: ${company.website}\n`;
      if (company.description) context += `About: ${company.description}\n`;
      if (company.documents?.productInfo) context += `\nProduct Info:\n${company.documents.productInfo}\n`;
      if (company.documents?.brandVoice) context += `\nBrand Voice:\n${company.documents.brandVoice}\n`;
      if (company.documents?.marketingStrategy) context += `\nMarketing Strategy:\n${company.documents.marketingStrategy}\n`;
    }

    if (auditResult) {
      context += `\n## Latest SEO Audit (${auditResult.url})
- Overall Score: ${auditResult.scores.overall}/100
- Mobile Performance: ${auditResult.scores.performanceMobile}/100
- SEO Score: ${auditResult.scores.seo}/100
- LCP: ${(auditResult.coreWebVitals.lcp / 1000).toFixed(1)}s
- CLS: ${auditResult.coreWebVitals.cls.toFixed(3)}

Top Fixes:
${auditResult.fixes?.slice(0, 5).map((f: any) => `- [${f.severity}] ${f.title}: ${f.description}`).join("\n") || "None"}

Real Estate Checks Failed:
${auditResult.realEstateChecks?.filter((c: any) => !c.passed).map((c: any) => `- ${c.label}: ${c.details}`).join("\n") || "All passed"}
`;
    }

    if (aiVisResult) {
      context += `\n## AI Visibility (GEO) Results
- Overall: ${aiVisResult.scores.overall}/100
- ChatGPT: ${aiVisResult.scores.chatgpt}/100
- Claude: ${aiVisResult.scores.claude}/100
- Perplexity: ${aiVisResult.scores.perplexity}/100
- Gemini: ${aiVisResult.scores.gemini}/100

Missing from AI answers for queries:
${aiVisResult.queryResults?.filter((q: any) => !q.chatgpt.mentioned && !q.claude.mentioned).slice(0, 5).map((q: any) => `- "${q.query}"`).join("\n") || "Present in most queries"}
`;
    }

    // Build messages with history
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    if (history) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: context,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { response: "Sorry, I encountered an error. Please try again." },
      { status: 500 }
    );
  }
}
