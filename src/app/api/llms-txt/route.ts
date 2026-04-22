import { NextRequest, NextResponse } from "next/server";

// ---------- Types ----------

interface Project {
  name: string;
  location: string;
  configurations: string;
  priceRange: string;
  website?: string;
  reraNumber?: string;
}

interface LlmsTxtInput {
  companyName: string;
  website: string;
  city: string;
  description: string;
  projects: Project[];
  usps?: string;
}

// ---------- Helpers ----------

function buildProjectLine(project: Project, fallbackWebsite: string): string {
  // Only use real URLs — fabricated /projects/slug paths almost certainly 404
  // and broken links in llms.txt are worse than no links.
  const url = project.website || fallbackWebsite;
  let line = `- [${project.name}](${url}): ${project.location}, ${project.configurations}, starting ${project.priceRange}`;
  if (project.reraNumber) {
    line += `. RERA: ${project.reraNumber}`;
  }
  return line;
}

function inferSpecialization(projects: Project[]): string {
  // Simple heuristic based on configurations
  const allConfigs = projects.map((p) => p.configurations.toLowerCase()).join(" ");
  const hasCommercial = allConfigs.includes("office") || allConfigs.includes("commercial") || allConfigs.includes("shop");
  const hasResidential = allConfigs.includes("bhk") || allConfigs.includes("apartment") || allConfigs.includes("villa");

  if (hasCommercial && hasResidential) return "Residential & Commercial";
  if (hasCommercial) return "Commercial";
  return "Residential";
}

function inferRegions(city: string, projects: Project[]): string {
  const locations = new Set<string>();
  if (city) locations.add(city);
  for (const p of projects) {
    if (!p.location) continue;
    const parts = p.location.split(",").map((s) => s.trim());
    for (const part of parts) {
      if (part.length > 2) locations.add(part);
    }
  }
  return Array.from(locations).join(", ");
}

// ---------- Route Handler ----------

export async function POST(req: NextRequest) {
  try {
    const body: LlmsTxtInput = await req.json();

    const { companyName, website, city, description, projects, usps } = body;

    if (!companyName || !website) {
      return NextResponse.json(
        { error: "companyName and website are required" },
        { status: 400 }
      );
    }

    const cleanWebsite = website.replace(/\/$/, "");
    const specialization = projects?.length ? inferSpecialization(projects) : "real estate";
    const regions = inferRegions(city || "", projects || []);

    // ---------- Verify which standard pages + project URLs actually exist ----------
    // We never want to emit broken links in llms.txt — customers paste
    // this straight into their site root. HEAD-check each candidate URL
    // and only include ones that resolve (2xx/3xx).

    async function urlResolves(url: string): Promise<boolean> {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
        clearTimeout(timeout);
        if (res.ok) return true;
        // Some servers 405 HEAD — try a lightweight GET.
        if (res.status === 405) {
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 4000);
          const res2 = await fetch(url, { method: "GET", signal: controller2.signal, redirect: "follow" });
          clearTimeout(timeout2);
          return res2.ok;
        }
        return false;
      } catch {
        return false;
      }
    }

    const [aboutOk, projectsOk, contactOk] = await Promise.all([
      urlResolves(`${cleanWebsite}/about`),
      urlResolves(`${cleanWebsite}/projects`),
      urlResolves(`${cleanWebsite}/contact`),
    ]);

    // Only emit project page links for projects that supply their own
    // `website`. Never fabricate `/projects/<slug>` — almost always 404.
    const projectPageLinks = (projects || [])
      .filter((p) => !!p.website)
      .map((p) =>
        `- [${p.name}](${p.website}): ${p.configurations} in ${p.location}, starting ${p.priceRange}`
      )
      .join("\n");

    const projectLines = (projects || []).map((p) => buildProjectLine(p, cleanWebsite)).join("\n");

    const locationLine = city ? ` headquartered in ${city},` : "";
    const regionsLine = regions ? `- Regions: ${regions}\n` : "";
    const hqLine = city ? `- Headquarters: ${city}\n` : "";
    const projectsSection = projectLines ? `## Projects\n\n${projectLines}\n\n` : "";

    const pageLines: string[] = [];
    if (aboutOk) pageLines.push(`- [About Us](${cleanWebsite}/about): Company history, vision, leadership`);
    if (projectsOk) pageLines.push(`- [Projects](${cleanWebsite}/projects): All ${specialization.toLowerCase()} projects`);
    if (contactOk) pageLines.push(`- [Contact](${cleanWebsite}/contact): Enquiry form, phone, email`);
    if (projectPageLinks) pageLines.push(projectPageLinks);
    const pagesSection = pageLines.length ? `\n\n## Pages\n\n${pageLines.join("\n")}` : "";

    const contactLine = contactOk ? `- Contact: ${cleanWebsite}/contact\n` : "";

    const llmsTxt = `# ${companyName}

> ${description || `${companyName} is a real estate developer.`}

${companyName} is a real estate developer${locationLine} specializing in ${specialization.toLowerCase()} projects.${usps ? ` ${usps}` : ""}${regions ? ` The company operates across ${regions}.` : ""}

${projectsSection}## Key Information

${hqLine}- Specialization: ${specialization}
${regionsLine}- Website: ${cleanWebsite}
${contactLine}`.trimEnd() + pagesSection;

    // Previous version also generated a long AI-written llms-full.txt with
    // fabricated "why choose us" bullets and made-up company history. Dropped
    // — the deterministic llms.txt is the only variant worth shipping.
    const instructions = [
      `Download the llms.txt file and upload it to your website root so it's accessible at ${cleanWebsite}/llms.txt — this is like robots.txt but for AI crawlers.`,
      `Add a reference in your HTML <head>: <link rel="llms-txt" href="/llms.txt" /> — helps AI crawlers discover it automatically.`,
      `Re-run the AI Visibility scan after uploading to verify that AI models can now find and reference your projects.`,
    ];

    return NextResponse.json({
      llmsTxt,
      fileName: "llms.txt",
      instructions,
    });
  } catch (error) {
    console.error("llms.txt generator error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "llms.txt generation failed" },
      { status: 500 }
    );
  }
}
