import { NextRequest, NextResponse } from "next/server";

/**
 * Public JS loader script. Customer embeds this ONE line in their site:
 *
 *   <script async src="https://cabbge.com/api/schema-loader"></script>
 *
 * On page load, the script fetches schema for the current URL and
 * injects it into <head> as JSON-LD. No per-page configuration needed.
 *
 * Served as application/javascript, cached at edge.
 */

const SCRIPT = `(function(){
  var origin = "https://cabbge.com";
  var pageUrl = window.location.origin + window.location.pathname;
  fetch(origin + "/api/schema-deploy?url=" + encodeURIComponent(pageUrl), {
    mode: "cors",
    credentials: "omit"
  })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if (!data || !data.schemas || !data.schemas.length) return;
      data.schemas.forEach(function(s){
        if (!s || !s.json) return;
        var script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-cabbge", s.type || "schema");
        script.textContent = JSON.stringify(s.json);
        document.head.appendChild(script);
      });
    })
    .catch(function(){ /* silent fail — never break the host site */ });
})();`;

export async function GET(_req: NextRequest) {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",  // 24h edge cache
      "Access-Control-Allow-Origin": "*",
    },
  });
}
