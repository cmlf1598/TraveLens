/**
 * Pure text helpers for turning Unsplash metadata into display copy.
 * No imports, so they can be unit-tested with `node --test` directly.
 */

const IMAGE_FILENAME = /\b[\w.-]+\.(?:jpe?g|png|gif|webp|avif|heic|heif|tiff?|raw|cr2|cr3|nef|arw|dng|orf|rw2)\b/gi;
const CAMERA_FILENAME = /\b(?:IMG|DSC[FN]?|PXL|GOPR|GX|DJI|MVIMG|VID|PANO|SAM|_MG)[_-]?\d{2,}[\w-]*\b/gi;
const NUMBERED_FRAME = /\bP\d{7}\b/g;
const EDGE_PUNCTUATION = /^[\s\-_,.:;|·•/]+|[\s\-_,:;|·•/]+$/g;
const MAX_LENGTH = 90;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lowercase, accent-free key for comparing place names ("Bogotá" == "bogota"). */
export function foldText(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Removes comma-separated segments that repeat an earlier one:
 * "Sydney, Sydney" → "Sydney"; "Paris, Île-de-France, Paris, France" → "Paris, Île-de-France, France".
 * Words inside a segment are never touched, so "Bora Bora" survives.
 */
export function dedupeSegments(text: string) {
  const seen = new Set<string>();
  const segments = text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      const key = foldText(s);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return segments.join(", ");
}

/**
 * Strips the photo ID and anything that looks like a file name, then tidies
 * whitespace and dangling punctuation. Returns null when nothing meaningful is left.
 */
export function cleanText(text: string | null | undefined, photoId: string): string | null {
  if (!text) return null;
  let out = text
    .replace(new RegExp(escapeRegExp(photoId), "gi"), " ")
    .replace(IMAGE_FILENAME, " ")
    .replace(CAMERA_FILENAME, " ")
    .replace(NUMBERED_FRAME, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(EDGE_PUNCTUATION, "");
  out = dedupeSegments(out);
  if (!/\p{L}{2,}/u.test(out)) return null;
  return out;
}

const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const HANDLE_OR_HASHTAG = /(^|\s)[@#][\p{L}\p{N}_.]+/gu;
/** Clauses that address the reader about the photographer rather than describe the place. */
const PROMO_CLAUSE =
  /\b(?:follow|sígueme|siguenos|instagram|insta|ig|facebook|tiktok|youtube|twitter|pinterest|behance|portfolio|website|subscribe|patreon|paypal|donat\w*|buy me a coffee|support me|dm me|contact me|check out)\b/i;
/** Clauses about the camera or editing rather than the scene. */
const GEAR_CLAUSE =
  /\b(?:shot (?:on|with)|taken (?:on|with)|i took|camera|lens|\d+\s?mm|f\/\d|iso\s?\d+|sony|canon|nikon|fuji(?:film)?|leica|iphone|pixel \d|dji|mavic|gopro|lightroom|preset)\b/i;
/** Sentence ends and commas, captured so kept clauses can be rejoined unchanged. */
const CLAUSE_SEPARATOR = /([.!?;|\n]+\s*|,\s*)/;

/**
 * Cleans a photographer-written description: drops URLs, @handles and #hashtags,
 * then removes whole clauses that are self-promotion or camera talk.
 * "Summers of Lisbon, Please follow me on instagram @x" → "Summers of Lisbon".
 */
export function cleanDescription(text: string | null | undefined, photoId: string): string | null {
  if (!text) return null;
  const parts = text.replace(URL_PATTERN, " ").replace(HANDLE_OR_HASHTAG, "$1").split(CLAUSE_SEPARATOR);
  const kept: { clause: string; separator: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i];
    if (!clause.trim() || PROMO_CLAUSE.test(clause) || GEAR_CLAUSE.test(clause)) continue;
    kept.push({ clause, separator: parts[i + 1] ?? "" });
  }
  // A separator only survives when another kept clause follows it.
  const joined = kept.map(({ clause, separator }, i) => clause + (i < kept.length - 1 ? separator : "")).join("");
  return cleanText(joined, photoId);
}

/** Unsplash topic slug → label: "street-photography" → "street photography". */
export function topicLabel(slug: string) {
  return slug.replace(/[-_]+/g, " ").trim();
}

/**
 * Turns an Unsplash slug ("vista-de-la-torre-eiffel-Dwu85P9SOIk") into a sentence
 * ("Vista de la torre eiffel"), dropping the trailing photo ID.
 */
export function slugToText(slug: string | null | undefined, photoId: string): string | null {
  if (!slug) return null;
  const withoutId = slug.replace(new RegExp(`-?${escapeRegExp(photoId)}$`, "i"), "");
  return cleanText(withoutId.replace(/[-_]+/g, " "), photoId);
}

/** Capitalizes the first letter and caps the length at a word boundary. */
export function toDisplayText(text: string) {
  const capitalized = text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
  if (capitalized.length <= MAX_LENGTH) return capitalized;
  const cut = capitalized.slice(0, MAX_LENGTH - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_LENGTH / 2)).trimEnd()}…`;
}

/** "nature", "city", "travel" → "Nature • City • Travel". */
export function formatTags(tags: string[]) {
  return tags.map((t) => t.charAt(0).toLocaleUpperCase("es") + t.slice(1)).join(" • ");
}
