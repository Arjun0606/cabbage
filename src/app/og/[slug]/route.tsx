import { ImageResponse } from "next/og";
import { lookupGrade } from "@/lib/agents/grader";

export const runtime = "nodejs";

/**
 * OG image generator for /visibility/[slug]. 1200×630 social card
 * with brand name + score + tier coloring. Heavy CDN caching since
 * the underlying grade is cached 7 days anyway.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug
    .replace(/\.png$/i, "")
    .replace(/^www\./, "")
    .toLowerCase();
  const grade = await lookupGrade(slug).catch(() => null);

  const brand = grade?.brand ?? slug;
  const score = grade?.scores.overall ?? null;
  const category = grade?.category || grade?.vertical || "";
  const scoreLabel = score == null ? "—" : String(score);

  const accent =
    score == null
      ? "#71717a"
      : score >= 70
        ? "#10b981"
        : score >= 40
          ? "#f59e0b"
          : "#ef4444";

  const verdict =
    score == null
      ? "Not yet graded"
      : score >= 70
        ? "Recommended"
        : score >= 40
          ? "Sometimes recommended"
          : "Rarely recommended";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          color: "#fafafa",
          display: "flex",
          flexDirection: "column",
          padding: "64px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 4,
            color: "#71717a",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          cabbge · AI visibility
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
            gap: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 720,
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 88,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              {brand}
            </div>
            <div style={{ fontSize: 30, color: "#a1a1aa", display: "flex" }}>
              {category || slug}
            </div>
            <div
              style={{
                fontSize: 26,
                color: accent,
                marginTop: 8,
                fontWeight: 600,
                display: "flex",
              }}
            >
              {verdict}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 220,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: accent,
                display: "flex",
              }}
            >
              {scoreLabel}
            </div>
            <div style={{ fontSize: 22, color: "#71717a", display: "flex" }}>
              / 100 by cabbge
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
