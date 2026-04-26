# Phase 2 Ideas

Write every out-of-scope idea here. Don't act on them until day 90.

- Hospitals / healthcare vertical
- Manufacturing vertical
- Big retail chains vertical
- Voice AI / lead calling agent
- Sponsored link placement automation (Google Ads integration)
- Multi-country expansion (UAE/GCC developers first)
- Portal listing management (auto-update 99acres/MagicBricks listings)
- Google Ads campaign optimization (like AdPrawn but for real estate)
- Broker/channel partner SEO toolkit (white-label for brokers)

---

## Real RERA + portal scrapers (deferred — high effort, low present-day ROI)

The `/api/rera-verify` and `/api/portal-coverage` endpoints currently use ChatGPT web_search heuristics. The dashboard labels them as "Indicative Match" / "Estimated coverage" so customers don't expect literal verification. Real verification requires building scrapers per state (RERA) and per portal — both are substantial engineering projects.

**RERA scrapers (per state — at least 10 states matter):**
- MahaRERA — public search, CAPTCHA-protected, headless browser required
- TSRERA — search by project name/number, JS-rendered, headless
- HARERA, K-RERA, RERA-AP, UP-RERA, Rajasthan, TN, WB, Gujarat — similar shape, each its own scraper

Each state: 4-8 hr without CAPTCHA, 12-20 hr with CAPTCHA. Total: 60-120 hr one-time + 8-15 hr/month maintenance as portals re-skin.

**Portal scrapers (per portal — 5 matter):**
- 99acres, Housing.com, MagicBricks, NoBroker, CommonFloor — each ~6-12 hr initial, 2-4 hr/month maintenance.

**Combined cost of doing it right:**
- ~80-150 engineering hours one-time + ~10-20 hr/month ongoing
- Playwright/Chromium runtime on Vercel adds infra cost
- CAPTCHA-solving service ~$0.01-0.03 per check
- COGS impact: $0.05-0.20 per RERA verify, $0.10-0.50 per portal scan

**Why deferred:**
The "Indicative" labels already prevent the credibility hit a wrong RERA badge would cause. Demos and mid-pitch don't need literal verification — they need to NOT lie, which the labels handle. The real signal this is worth building is when ≥5 paying customers specifically ask for verified cross-checks; that's PMF for the feature, not a hypothesis.

**When that triggers:** start with MahaRERA + TSRERA + K-RERA (three biggest residential markets) and 99acres + Housing (highest-traffic portals). Two states + two portals covers ~70% of customer demand. Other states/portals add as customer geography demands.
