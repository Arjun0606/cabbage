/**
 * WordPress Publishing Integration
 *
 * Supports both WordPress.com (OAuth) and self-hosted WordPress (application passwords).
 * Publishes generated articles directly to the customer's blog.
 */

// ---------- Types ----------

export interface WordPressCredentials {
  type: "wordpress_com" | "self_hosted";
  siteUrl: string;
  // WordPress.com OAuth
  accessToken?: string;
  // Self-hosted application password
  username?: string;
  applicationPassword?: string;
}

export interface WordPressPost {
  title: string;
  content: string;
  excerpt?: string;
  status: "draft" | "publish" | "pending";
  categories?: number[];
  tags?: string[];
  featured_media?: number;
  meta?: {
    _yoast_wpseo_title?: string;
    _yoast_wpseo_metadesc?: string;
    _yoast_wpseo_focuskw?: string;
  };
}

export interface PublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}

// ---------- WordPress.com API ----------

async function publishToWordPressCom(
  credentials: WordPressCredentials,
  post: WordPressPost
): Promise<PublishResult> {
  const siteId = credentials.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const res = await fetch(
    `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts/new`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || "",
        status: post.status,
        tags: post.tags?.join(",") || "",
      }),
    }
  );

  const data = await res.json();
  if (data.error) {
    return { success: false, error: data.message || data.error };
  }

  return {
    success: true,
    postId: data.ID,
    postUrl: data.URL,
  };
}

// ---------- Self-Hosted WordPress REST API ----------

async function publishToSelfHosted(
  credentials: WordPressCredentials,
  post: WordPressPost
): Promise<PublishResult> {
  const baseUrl = credentials.siteUrl.replace(/\/$/, "");
  const auth = Buffer.from(
    `${credentials.username}:${credentials.applicationPassword}`
  ).toString("base64");

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      status: post.status,
      tags: post.tags || [],
      meta: post.meta || {},
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    return { success: false, error: error.message || `HTTP ${res.status}` };
  }

  const data = await res.json();
  return {
    success: true,
    postId: data.id,
    postUrl: data.link,
  };
}

// ---------- Webflow CMS API ----------

export interface WebflowCredentials {
  apiToken: string;
  siteId: string;
  collectionId: string; // The blog/articles collection
}

async function publishToWebflow(
  credentials: WebflowCredentials,
  post: WordPressPost
): Promise<PublishResult> {
  const res = await fetch(
    `https://api.webflow.com/v2/collections/${credentials.collectionId}/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isArchived: false,
        isDraft: post.status === "draft",
        fieldData: {
          name: post.title,
          slug: post.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-"),
          "post-body": post.content,
          "post-summary": post.excerpt || "",
          "meta-title": post.meta?._yoast_wpseo_title || post.title,
          "meta-description": post.meta?._yoast_wpseo_metadesc || post.excerpt || "",
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    return { success: false, error: error.message || `HTTP ${res.status}` };
  }

  const data = await res.json();
  return {
    success: true,
    postId: data.id,
    postUrl: `${credentials.siteId}/${data.fieldData?.slug || ""}`,
  };
}

// ---------- Main Publish Function ----------

export async function publishContent(
  provider: "wordpress_com" | "self_hosted" | "webflow",
  credentials: WordPressCredentials | WebflowCredentials,
  post: WordPressPost
): Promise<PublishResult> {
  switch (provider) {
    case "wordpress_com":
      return publishToWordPressCom(credentials as WordPressCredentials, post);
    case "self_hosted":
      return publishToSelfHosted(credentials as WordPressCredentials, post);
    case "webflow":
      return publishToWebflow(credentials as WebflowCredentials, post);
    default:
      return { success: false, error: `Unknown provider: ${provider}` };
  }
}

/**
 * Test connection to a WordPress or Webflow site.
 */
export async function testConnection(
  provider: "wordpress_com" | "self_hosted" | "webflow",
  credentials: WordPressCredentials | WebflowCredentials
): Promise<{ connected: boolean; siteName?: string; error?: string }> {
  try {
    if (provider === "webflow") {
      const creds = credentials as WebflowCredentials;
      const res = await fetch(`https://api.webflow.com/v2/sites/${creds.siteId}`, {
        headers: { Authorization: `Bearer ${creds.apiToken}` },
      });
      if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { connected: true, siteName: data.displayName || data.shortName };
    }

    const creds = credentials as WordPressCredentials;
    const baseUrl = creds.siteUrl.replace(/\/$/, "");

    if (provider === "wordpress_com") {
      const siteId = baseUrl.replace(/^https?:\/\//, "");
      const res = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/${siteId}`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { connected: true, siteName: data.name };
    }

    // Self-hosted
    const auth = Buffer.from(`${creds.username}:${creds.applicationPassword}`).toString("base64");
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { connected: true, siteName: data.name };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
