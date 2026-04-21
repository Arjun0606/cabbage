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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

    // ---------- Build llms.txt (concise version) ----------

    const projectLines = (projects || []).map((p) => buildProjectLine(p, cleanWebsite)).join("\n");

    const projectPageLinks = (projects || [])
      .map((p) => {
        const url = p.website || `${cleanWebsite}/projects/${slugify(p.name)}`;
        return `- [${p.name}](${url}): ${p.configurations} in ${p.location}, starting ${p.priceRange}`;
      })
      .join("\n");

    const locationLine = city ? ` headquartered in ${city},` : "";
    const regionsLine = regions ? `- Regions: ${regions}\n` : "";
    const hqLine = city ? `- Headquarters: ${city}\n` : "";
    const projectsSection = projectLines ? `## Projects\n\n${projectLines}\n\n` : "";

    const llmsTxt = `# ${companyName}

> ${description || `${companyName} is a real estate developer.`}

${companyName} is a real estate developer${locationLine} specializing in ${specialization.toLowerCase()} projects.${usps ? ` ${usps}` : ""}${regions ? ` The company operates across ${regions}.` : ""}

${projectsSection}## Key Information

${hqLine}- Specialization: ${specialization}
${regionsLine}- Website: ${cleanWebsite}
- Contact: ${cleanWebsite}/contact

## Pages

- [About Us](${cleanWebsite}/about): Company history, vision, leadership
- [Projects](${cleanWebsite}/projects): All ${specialization.toLowerCase()} projects
- [Contact](${cleanWebsite}/contact): Enquiry form, phone, email
${projectPageLinks}`;

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
