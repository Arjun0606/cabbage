export type WritingInstructions = Record<string, string> | undefined;

export function formatWritingInstructions(
  wi: WritingInstructions,
  channelKey: string,
  channelLabel: string
): string {
  if (!wi) return "";
  const general = typeof wi.general === "string" ? wi.general.substring(0, 2000) : "";
  const channel = typeof wi[channelKey] === "string" ? wi[channelKey].substring(0, 2000) : "";
  if (!general && !channel) return "";
  return `\n**Writing Instructions (from Settings → Personalization — follow EXACTLY):**
${general ? `General: ${general}` : ""}
${channel ? `${channelLabel}-specific: ${channel}` : ""}
These override any generic tone — match the voice, phrasing rules, dos/donts listed above.\n`;
}
