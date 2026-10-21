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
