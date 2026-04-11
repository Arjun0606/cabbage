/**
 * Input validation and sanitization for all API routes.
 */

/**
 * Sanitize and validate a URL input.
 * Prevents SSRF, command injection, and malformed URLs.
 */
export function sanitizeUrl(input: string): { valid: boolean; url: string; error?: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, url: "", error: "URL is required" };
  }

  // Trim and basic cleanup
  let url = input.trim();

  // Block obvious attack patterns
  if (/[<>"'`{}|\\^~\[\]]/.test(url)) {
    return { valid: false, url: "", error: "Invalid characters in URL" };
  }

  // Block internal/private network access (SSRF prevention)
  const ssrfPatterns = [
    /^https?:\/\/localhost/i,
    /^https?:\/\/127\./,
    /^https?:\/\/0\./,
    /^https?:\/\/10\./,
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
    /^https?:\/\/192\.168\./,
    /^https?:\/\/169\.254\./,
    /^https?:\/\/\[::1\]/,
    /^https?:\/\/metadata\./i,
    /^file:/i,
    /^ftp:/i,
    /^javascript:/i,
    /^data:/i,
  ];

  // Add protocol if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  for (const pattern of ssrfPatterns) {
    if (pattern.test(url)) {
      return { valid: false, url: "", error: "Invalid URL — internal addresses not allowed" };
    }
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, url: "", error: "Only HTTP/HTTPS URLs are allowed" };
    }
    // Must have a valid hostname with at least one dot (no bare hostnames)
    if (!parsed.hostname.includes(".")) {
      return { valid: false, url: "", error: "Please enter a valid domain (e.g. example.com)" };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, url: "", error: "Invalid URL format" };
  }
}

/**
 * Sanitize text input — strip HTML, limit length.
 */
export function sanitizeText(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>"']/g, "")  // Remove dangerous chars
    .trim()
    .substring(0, maxLength);
}

/**
 * Validate that a request body is JSON and not too large.
 */
export function validateRequestSize(body: unknown): { valid: boolean; error?: string } {
  const str = JSON.stringify(body);
  if (str.length > 100000) { // 100KB max
    return { valid: false, error: "Request body too large" };
  }
  return { valid: true };
}
