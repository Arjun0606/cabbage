import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Automated Cron — runs every 4 hours.
 *
 * For each company in the database:
 * 1. Runs SEO audit + technical scan
 * 2. Runs AI visibility check (ChatGPT + Google AI)
 * 3. Runs backlink analysis
 * 4. Generates content drafts (blog topics, LinkedIn, WhatsApp)
 * 5. Stores everything in scan_history + generated_content
 *
 * Like Okara's "AI CMO Terminal • Running Daily" but every 4 hours.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const results: { company: string; scans: string[]; content: string[]; errors: string[] }[] = [];

  try {
    const supabase = getServiceClient();

    // Get all companies with their projects
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, website, city, description, product_info, brand_voice, brand_values, target_audience, marketing_strategy")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!companies?.length) {
      return NextResponse.json({ message: "No companies to scan", results: [] });
    }

    for (const company of companies) {
      if (!company.website) continue;

      const companyResult = { company: company.name, scans: [] as string[], content: [] as string[], errors: [] as string[] };

      // Get projects for this company
      const { data: projects } = await supabase
        .from("projects")
        .select("name, website, location, configurations, price_range, rera_number, amenities, status")
        .eq("company_id", company.id);

      // ---- PHASE 1: SCANS (parallel) ----
      try {
        const [auditRes, techRes, backlinkRes] = await Promise.all([
          fetchApi(origin, "/api/audit", { url: company.website }),
          fetchApi(origin, "/api/technical-seo", { url: company.website }),
          fetchApi(origin, "/api/backlinks", { url: company.website }),
        ]);

        // Store scan results
        if (auditRes?.scores) {
          await supabase.from("scan_history").insert({
            company_id: company.id, scan_type: "audit", url: company.website,
            score: auditRes.scores.overall || 0, results: auditRes, triggered_by: "cron",
          });
          companyResult.scans.push(`Audit: ${auditRes.scores.overall}/100`);
        }

        if (techRes?.onPageScore !== undefined) {
          await supabase.from("scan_history").insert({
            company_id: company.id, scan_type: "technical", url: company.website,
            score: techRes.onPageScore || 0, results: techRes, triggered_by: "cron",
          });
          companyResult.scans.push(`Technical: ${techRes.onPageScore}/100`);
        }

        if (backlinkRes?.domainAuthority !== undefined) {
          await supabase.from("scan_history").insert({
            company_id: company.id, scan_type: "backlinks", url: company.website,
            score: backlinkRes.domainAuthority || 0, results: backlinkRes, triggered_by: "cron",
          });
          companyResult.scans.push(`Backlinks: DA ${backlinkRes.domainAuthority}`);
        }
      } catch (err) {
        companyResult.errors.push(`Scan error: ${err instanceof Error ? err.message : "unknown"}`);
      }

      // ---- PHASE 2: AI VISIBILITY ----
      try {
        if (company.name) {
          const aiVisRes = await fetchApi(origin, "/api/ai-visibility", {
            websiteUrl: company.website,
            brand: company.name,
            projects: (projects || []).map((p: any) => p.name),
            city: company.city || "",
          });

          if (aiVisRes?.scores) {
            await supabase.from("scan_history").insert({
              company_id: company.id, scan_type: "ai_visibility", url: company.website,
              score: aiVisRes.scores.overall || 0, results: aiVisRes, triggered_by: "cron",
            });
            companyResult.scans.push(`AI Visibility: ${aiVisRes.scores.overall}/100 (Readiness: ${aiVisRes.scores.readiness}%)`);
          }
        }
      } catch (err) {
        companyResult.errors.push(`AI visibility error: ${err instanceof Error ? err.message : "unknown"}`);
      }

      // ---- PHASE 3: CONTENT GENERATION ----
      // Generate content for the first project (or company-level if no projects)
      try {
        const project = projects?.[0];
        const contentPayload = {
          projectName: project?.name || company.name,
          developerName: company.name,
          location: project?.location || company.city || "",
          city: company.city || "",
          configurations: project?.configurations || "",
          priceRange: project?.price_range || "",
          usps: company.description || "",
          brandVoice: company.brand_voice || "",
          brandValues: company.brand_values || "",
          targetAudience: company.target_audience || "",
          productInfo: company.product_info || "",
          amenities: project?.amenities || "",
          reraNumber: project?.rera_number || "",
        };

        const contentRes = await fetchApi(origin, "/api/local-content", contentPayload);

        if (contentRes?.blogTopics?.length) {
          // Store blog topics as drafts
          for (const topic of contentRes.blogTopics.slice(0, 3)) {
            await supabase.from("generated_content").insert({
              company_id: company.id,
              content_type: "blog_post",
              title: topic.title,
              body: `Target Keyword: ${topic.targetKeyword}\nWord Count: ${topic.estimatedWordCount}\n\nOutline:\n${(topic.outline || []).map((s: string) => `- ${s}`).join("\n")}`,
              target_keywords: [topic.targetKeyword],
              status: "draft",
            });
          }
          companyResult.content.push(`${contentRes.blogTopics.length} blog topics`);
        }

        if (contentRes?.linkedinPosts?.length) {
          for (const post of contentRes.linkedinPosts) {
            await supabase.from("generated_content").insert({
              company_id: company.id,
              content_type: "linkedin_post",
              title: `LinkedIn Post — ${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
              body: post,
              status: "draft",
            });
          }
          companyResult.content.push(`${contentRes.linkedinPosts.length} LinkedIn posts`);
        }

        if (contentRes?.whatsappMessages?.length) {
          for (const msg of contentRes.whatsappMessages) {
            await supabase.from("generated_content").insert({
              company_id: company.id,
              content_type: "whatsapp_broadcast",
              title: `WhatsApp — ${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
              body: msg,
              status: "draft",
            });
          }
          companyResult.content.push(`${contentRes.whatsappMessages.length} WhatsApp messages`);
        }
      } catch (err) {
        companyResult.errors.push(`Content error: ${err instanceof Error ? err.message : "unknown"}`);
      }

      results.push(companyResult);
    }

    const successCount = results.filter(r => r.errors.length === 0).length;
    return NextResponse.json({
      message: `Processed ${successCount}/${results.length} companies`,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}

async function fetchApi(origin: string, path: string, body: any): Promise<any> {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Attempt to parse body safely
  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error(`cron fetchApi: failed to parse JSON from ${path} (status ${res.status})`, err);
    throw new Error(`${path} returned non-JSON response (status ${res.status})`);
  }

  if (!res.ok) {
    const errMsg = data?.error || `HTTP ${res.status}`;
    console.error(`cron fetchApi: ${path} failed (${res.status}):`, errMsg);
    throw new Error(`${path} failed: ${errMsg}`);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}
