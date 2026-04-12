import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

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
  const url = project.website || `${fallbackWebsite.replace(/\/$/, "")}/projects/${slugify(project.name)}`;
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
  locations.add(city);
  for (const p of projects) {
    // Extract city-level info from location if it differs
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

    if (!companyName || !website || !city || !projects?.length) {
      return NextResponse.json(
        { error: "companyName, website, city, and at least one project are required" },
        { status: 400 }
      );
    }

    const cleanWebsite = website.replace(/\/$/, "");
    const specialization = inferSpecialization(projects);
    const regions = inferRegions(city, projects);

    // ---------- Build llms.txt (concise version) ----------

    const projectLines = projects.map((p) => buildProjectLine(p, cleanWebsite)).join("\n");

    const projectPageLinks = projects
      .map((p) => {
        const url = p.website || `${cleanWebsite}/projects/${slugify(p.name)}`;
        return `- [${p.name}](${url}): ${p.configurations} in ${p.location}, starting ${p.priceRange}`;
      })
      .join("\n");

    const llmsTxt = `# ${companyName}

> ${description}

${companyName} is a real estate developer headquartered in ${city}, specializing in ${specialization.toLowerCase()} projects.${usps ? ` ${usps}` : ""} The company operates across ${regions} and is known for delivering RERA-registered developments.

## Projects

${projectLines}

## Key Information

- Headquarters: ${city}
- Specialization: ${specialization}
- Regions: ${regions}
- RERA Registered: Yes
- Contact: ${cleanWebsite}/contact

## Pages

- [About Us](${cleanWebsite}/about): Company history, vision, leadership
- [Projects](${cleanWebsite}/projects): All ${specialization.toLowerCase()} projects
- [Contact](${cleanWebsite}/contact): Enquiry form, phone, email
${projectPageLinks}`;

    // ---------- Build llms-full.txt via AI (detailed version) ----------

    const projectSummaries = projects
      .map(
        (p) =>
          `- ${p.name}: ${p.location}, ${p.configurations}, ${p.priceRange}${p.reraNumber ? `, RERA: ${p.reraNumber}` : ""}`
      )
      .join("\n");

    const systemPrompt = `You generate llms-full.txt files for real estate developer websites. This file follows the llms.txt standard — it helps AI models understand a company and its projects in detail.

Output ONLY the raw text content (no markdown code fences, no JSON wrapping). Use the exact format shown below with # headings and markdown links.`;

    const userPrompt = `Generate a detailed llms-full.txt for:

**Company:** ${companyName}
**Website:** ${cleanWebsite}
**City:** ${city}
**Description:** ${description}
**USPs:** ${usps || "Not specified"}
**Projects:**
${projectSummaries}

Use this EXACT structure:

# ${companyName}

> ${description}

[Write 2-3 detailed paragraphs about the company: who they are, what they build, their philosophy, where they operate, and what makes them stand out. Reference their USPs and project portfolio.]

## Projects

[For EACH project, write a detailed entry like this:]

### {Project Name}
- **Location:** {full location}
- **Configurations:** {all configs}
- **Price Range:** {price}
- **RERA:** {number or "Registered"}
- **Website:** {url}

{2-3 paragraphs describing the project in detail: what makes it unique, amenities, nearby landmarks, connectivity, why a buyer should consider it. Be specific and helpful — this is what AI models will read when someone asks about this project.}

## Key Information

- Headquarters: ${city}
- Founded: Established developer
- Specialization: ${specialization}
- Regions: ${regions}
- RERA Registered: Yes
- Contact: ${cleanWebsite}/contact

## Why Choose ${companyName}

[3-5 bullet points on company differentiators]

## Pages

- [About Us](${cleanWebsite}/about): Company history, vision, leadership team
- [Projects](${cleanWebsite}/projects): Complete portfolio of ${specialization.toLowerCase()} projects
- [Contact](${cleanWebsite}/contact): Enquiry form, phone numbers, email, office address
${projects.map((p) => `- [${p.name}](${p.website || `${cleanWebsite}/projects/${slugify(p.name)}`}): Detailed project page with floor plans, pricing, and amenities`).join("\n")}`;

    const llmsFullTxt = await aiComplete(systemPrompt, userPrompt, 3000);

    // ---------- Instructions ----------

    const instructions = [
      `Download the llms.txt file and upload it to your website root so it's accessible at ${cleanWebsite}/llms.txt — this is like robots.txt but for AI crawlers.`,
      `Upload llms-full.txt to ${cleanWebsite}/llms-full.txt — this gives AI models detailed information about your projects when they want to go deeper.`,
      `Add a reference in your HTML <head>: <link rel="llms-txt" href="/llms.txt" /> — this helps AI crawlers discover your llms.txt file automatically.`,
      `Re-run the AI Visibility scan after uploading to verify that AI models can now find and reference your projects.`,
    ];

    return NextResponse.json({
      llmsTxt,
      llmsFullTxt,
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
