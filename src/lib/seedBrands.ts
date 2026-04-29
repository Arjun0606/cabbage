/**
 * Curated seed list of well-known brands across high-search-volume
 * SMB categories. The cron walks this list and pre-populates
 * public_grades so /visibility/[slug] and /best/[category] surfaces
 * have real data on day one — no waiting for organic traffic to
 * seed the SEO surface.
 *
 * ~250 brands × ~$0.05 per fresh grade ≈ $13 to seed. With a
 * weekly refresh that's ~$55/month, well inside marketing budget.
 *
 * Curation rules:
 *  - Categories users actually search for ("CRM software", not
 *    "real estate developer in Hyderabad" — that's the old RE list)
 *  - Each entry is just a hostname + category hint. The classifier
 *    extracts brand name, aliases, competitors automatically.
 *  - No real-estate brands. No vertical-specific lists.
 */

export interface SeedBrand {
  url: string;
  category: string;
}

const G = (category: string, urls: string[]): SeedBrand[] =>
  urls.map((url) => ({ url, category }));

export const SEED_BRANDS: SeedBrand[] = [
  ...G("CRM software", [
    "hubspot.com", "salesforce.com", "pipedrive.com", "close.com",
    "copper.com", "attio.com", "folk.app", "monday.com",
    "activecampaign.com", "zoho.com", "freshworks.com", "keap.com",
  ]),
  ...G("Project management software", [
    "asana.com", "linear.app", "trello.com", "notion.so",
    "clickup.com", "basecamp.com", "atlassian.com", "height.app",
    "shortcut.com", "todoist.com", "airtable.com", "wrike.com",
  ]),
  ...G("Email marketing software", [
    "mailchimp.com", "convertkit.com", "beehiiv.com", "substack.com",
    "loops.so", "resend.com", "klaviyo.com", "customer.io",
    "postmark.com", "brevo.com", "constantcontact.com",
  ]),
  ...G("Web analytics", [
    "plausible.io", "usefathom.com", "mixpanel.com", "amplitude.com",
    "posthog.com", "heap.io", "segment.com", "june.so",
    "pirsch.io", "matomo.org", "umami.is",
  ]),
  ...G("Design tools", [
    "figma.com", "sketch.com", "framer.com", "webflow.com",
    "canva.com", "photopea.com", "penpot.app", "spline.design",
    "rive.app", "marvelapp.com", "lunacy.com",
  ]),
  ...G("Code editor", [
    "code.visualstudio.com", "cursor.com", "zed.dev", "jetbrains.com",
    "sublimetext.com", "neovim.io", "helix-editor.com",
    "windsurf.com", "lapce.dev",
  ]),
  ...G("AI coding assistant", [
    "cursor.com", "github.com", "codeium.com", "tabnine.com",
    "sourcegraph.com", "continue.dev", "aider.chat", "cody.dev",
  ]),
  ...G("Hosting and deployment", [
    "vercel.com", "netlify.com", "cloudflare.com", "railway.app",
    "render.com", "fly.io", "heroku.com", "digitalocean.com",
    "linode.com", "deno.com",
  ]),
  ...G("Online form builder", [
    "typeform.com", "tally.so", "fillout.com", "jotform.com",
    "formspree.io", "paperform.co", "feathery.io", "youform.com",
  ]),
  ...G("Note taking app", [
    "notion.so", "obsidian.md", "logseq.com", "bear.app",
    "reflect.app", "mem.ai", "craft.do", "anytype.io", "tana.inc",
  ]),
  ...G("Customer support software", [
    "zendesk.com", "intercom.com", "helpscout.com", "freshdesk.com",
    "plain.com", "front.com", "kustomer.com", "gorgias.com",
    "crisp.chat", "tidio.com",
  ]),
  ...G("Authentication service", [
    "auth0.com", "clerk.com", "supabase.com", "firebase.google.com",
    "workos.com", "stytch.com", "kinde.com", "frontegg.com",
    "ory.sh",
  ]),
  ...G("Database and backend", [
    "supabase.com", "planetscale.com", "neon.tech", "mongodb.com",
    "firebase.google.com", "turso.tech", "convex.dev", "xata.io",
    "cockroachlabs.com",
  ]),
  ...G("Payment processing", [
    "stripe.com", "paddle.com", "lemonsqueezy.com", "polar.sh",
    "dodopayments.com", "square.com", "paypal.com", "adyen.com",
    "braintreepayments.com", "checkout.com",
  ]),
  ...G("Team chat and communication", [
    "slack.com", "discord.com", "microsoft.com", "twist.com",
    "element.io", "rocket.chat", "mattermost.com", "pumble.com",
  ]),
  ...G("Monitoring and observability", [
    "datadoghq.com", "sentry.io", "grafana.com", "honeycomb.io",
    "betterstack.com", "highlight.io", "axiom.co", "logtail.com",
  ]),
  ...G("Password manager", [
    "1password.com", "bitwarden.com", "lastpass.com", "dashlane.com",
    "proton.me", "keepersecurity.com", "nordpass.com",
  ]),
  ...G("VPN service", [
    "nordvpn.com", "expressvpn.com", "protonvpn.com", "mullvad.net",
    "surfshark.com", "windscribe.com", "tailscale.com",
  ]),
  ...G("Ecommerce platform", [
    "shopify.com", "woocommerce.com", "bigcommerce.com",
    "squarespace.com", "wix.com", "webflow.com", "square.com",
    "etsy.com",
  ]),
  ...G("Email client", [
    "superhuman.com", "spikenow.com", "hey.com", "front.com",
    "missiveapp.com", "tutanota.com", "fastmail.com",
    "shortwave.com",
  ]),
  ...G("Meditation app", [
    "calm.com", "headspace.com", "wakingup.com", "insighttimer.com",
    "tenpercent.com", "balanceapp.com",
  ]),
  ...G("Fitness tracking app", [
    "strava.com", "myfitnesspal.com", "future.co", "peloton.com",
    "tonal.com", "whoop.com", "ouraring.com", "fitbit.com",
  ]),
  ...G("Personal finance app", [
    "ynab.com", "monarchmoney.com", "copilot.money", "lunchmoney.app",
    "pocketguard.com", "rocketmoney.com", "tillerhq.com",
  ]),
  ...G("Habit tracker app", [
    "streaks.app", "habitica.com", "fabriq.app", "stickk.com",
    "way-of-life.com",
  ]),
  ...G("AI writing assistant", [
    "jasper.ai", "copy.ai", "writesonic.com", "rytr.me",
    "lex.page", "sudowrite.com", "anyword.com",
  ]),
  ...G("Sales prospecting tool", [
    "apollo.io", "zoominfo.com", "lusha.com", "lemlist.com",
    "outreach.io", "salesloft.com", "reply.io", "instantly.ai",
  ]),
  ...G("File storage and sharing", [
    "dropbox.com", "drive.google.com", "onedrive.live.com", "box.com",
    "icloud.com", "mega.io", "pcloud.com",
  ]),
];

export function brandsNotIn(graded: Set<string>): SeedBrand[] {
  return SEED_BRANDS.filter(
    (b) => !graded.has(b.url.replace(/^www\./, "").toLowerCase()),
  );
}
