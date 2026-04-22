import { NextRequest, NextResponse } from "next/server";

/**
 * Universal content loader — served as application/javascript so the
 * customer's site can embed a single <script> tag:
 *
 *   <script defer src="https://cabbge.com/api/content-loader"></script>
 *
 * The script finds every [data-cabbge-slot] element on the page, fetches
 * the deployed HTML for (window.location.origin, slot), and injects it.
 * Also bumps the <title> and <meta name="description"> when a `meta` blob
 * is returned and the element has data-cabbge-slot-meta="page".
 *
 * Fails silently on every error — never break the host site.
 */

const SCRIPT = `(function(){
  var origin = "https://cabbge.com";
  var site = window.location.origin;
  var nodes = document.querySelectorAll("[data-cabbge-slot]");
  if (!nodes.length) return;
  nodes.forEach(function(el){
    var slot = el.getAttribute("data-cabbge-slot");
    if (!slot) return;
    var url = origin + "/api/content-deploy?url=" + encodeURIComponent(site) + "&slot=" + encodeURIComponent(slot);
    fetch(url, { mode: "cors", credentials: "omit" })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data || !data.found || !data.html) return;
        el.innerHTML = data.html;
        el.setAttribute("data-cabbge-loaded", "1");
        if (data.meta && data.meta.title && el.getAttribute("data-cabbge-slot-meta") === "page") {
          try { document.title = data.meta.title; } catch(e) {}
          var desc = document.querySelector('meta[name="description"]');
          if (desc && data.meta.metaDescription) desc.setAttribute("content", data.meta.metaDescription);
        }
      })
      .catch(function(){ /* silent */ });
  });
})();`;

export async function GET(_req: NextRequest) {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400", // 24h
      "Access-Control-Allow-Origin": "*",
    },
  });
}
