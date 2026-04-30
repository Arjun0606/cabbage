#!/usr/bin/env node
// scripts/outbound-batch.mjs
//
// Cold-outreach batch tool for the launch push.
//
// Usage:
//   node scripts/outbound-batch.mjs <input.csv> [output.csv]
//
//   input.csv  — header row "url[, first_name, company]"
//                  url is required, the others are optional and pass through
//   output.csv — defaults to outbound-<timestamp>.csv next to the input
//
// What it does:
//   1. Reads the input CSV
//   2. Calls /api/outreach/batch in chunks of 50 against cabbge.com
//      (the same kit that powers /dashboard/outreach)
//   3. Writes a Lemlist/Instantly-friendly output CSV with columns
//      first_name, company, email_subject, email_body, linkedin_dm,
//      visibility_url, score, plus any pass-through columns
//
// Auth: requires you to be logged into cabbge.com OR run the local
// dev server with DISABLE_PAYWALL=true. The simplest path for a
// launch push is to point this at https://cabbge.com directly with
// a valid session cookie.
//
// Env:
//   CABBGE_BASE_URL       default https://cabbge.com
//   CABBGE_AUTH_COOKIE    full Cookie header value, including the
//                         supabase auth token. Get it from devtools
//                         while logged in.

import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.CABBGE_BASE_URL || "https://cabbge.com";
const AUTH_COOKIE = process.env.CABBGE_AUTH_COOKIE || "";
const CHUNK_SIZE = 50;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
  return { header, rows };
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

function csvCell(s) {
  const v = String(s ?? "");
  if (/[,"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

async function batchScan(urls) {
  const headers = { "Content-Type": "application/json" };
  if (AUTH_COOKIE) headers.Cookie = AUTH_COOKIE;
  const res = await fetch(`${BASE_URL}/api/outreach/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`batch failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  return await res.json();
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      "usage: node scripts/outbound-batch.mjs <input.csv> [output.csv]",
    );
    process.exit(1);
  }
  const outputPath =
    process.argv[3] ||
    path.join(
      path.dirname(inputPath),
      `outbound-${new Date().toISOString().split("T")[0]}.csv`,
    );

  const text = fs.readFileSync(inputPath, "utf8");
  const { header, rows } = parseCsv(text);
  if (!header.includes("url")) {
    console.error('input csv must have a "url" column');
    process.exit(1);
  }

  console.log(`loaded ${rows.length} prospects from ${inputPath}`);
  const passthroughHeaders = header.filter((h) => h !== "url");
  const allUrls = rows.map((r) => r.url).filter(Boolean);

  const out = [];
  for (let i = 0; i < allUrls.length; i += CHUNK_SIZE) {
    const chunk = allUrls.slice(i, i + CHUNK_SIZE);
    console.log(`  chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(allUrls.length / CHUNK_SIZE)} (${chunk.length} urls)…`);
    try {
      const data = await batchScan(chunk);
      for (const r of data.results || []) {
        const sourceRow = rows.find((row) => row.url === r.url) || {};
        const passthrough = {};
        for (const h of passthroughHeaders) passthrough[h] = sourceRow[h] || "";
        out.push({
          url: r.url,
          slug: r.slug || "",
          brand: r.brand || "",
          category: r.category || "",
          score: r.score ?? "",
          cache_hit: r.cacheHit ? "yes" : "no",
          email_subject: r.emailSubject || "",
          email_body: r.emailBody || "",
          linkedin_dm: r.linkedinDm || "",
          visibility_url: r.visibilityUrl || "",
          error: r.error || "",
          ...passthrough,
        });
      }
    } catch (err) {
      console.error(`  chunk failed:`, err.message);
      for (const url of chunk) {
        out.push({
          url,
          slug: "",
          brand: "",
          category: "",
          score: "",
          cache_hit: "no",
          email_subject: "",
          email_body: "",
          linkedin_dm: "",
          visibility_url: "",
          error: err.message,
        });
      }
    }
  }

  // Build output CSV
  const outHeader = [
    "url",
    "slug",
    "brand",
    "category",
    "score",
    "cache_hit",
    "email_subject",
    "email_body",
    "linkedin_dm",
    "visibility_url",
    "error",
    ...passthroughHeaders,
  ];
  const lines = [outHeader.join(",")];
  for (const r of out) {
    lines.push(outHeader.map((h) => csvCell(r[h])).join(","));
  }
  fs.writeFileSync(outputPath, lines.join("\n"));
  console.log(`\nwrote ${out.length} rows to ${outputPath}`);
  const ok = out.filter((r) => r.email_body && !r.error).length;
  console.log(`  ${ok} with email drafts (${Math.round((ok / out.length) * 100)}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
