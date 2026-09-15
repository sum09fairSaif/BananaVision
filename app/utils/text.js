// Helpers for the prose the API returns and the name the user types.

export const NAME_MAX_LENGTH = 30;

// Digits and symbols that never appear in a first name. Letters from every
// script, spaces, hyphens, apostrophes, and periods are all allowed.
const NAME_INVALID = /[0-9_@#$%^&*()+=[\]{};:"\\|<>/?!~`,]/;

export function normalizeName(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

// Returns an error message, or null when the name is acceptable.
export function validateName(raw) {
  const name = normalizeName(raw);
  if (!name) return "Please enter your first name.";
  if (NAME_INVALID.test(name)) return "Use letters only — no numbers or symbols.";
  return null;
}

// banana_stages.md is hard-wrapped at ~88 characters, so the API's text has a
// newline mid-sentence on every line. Rejoin lines into real paragraphs and
// drop markdown emphasis so the phone can wrap text to its own width.
export function toParagraphs(text) {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .join(" ")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s).,;:!?]|$)/g, "$1$2")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

// Splits a paragraph into plain text and citation runs like " [3][5]" so the
// citations can be rendered quieter than the sentence they support.
export function splitCitations(paragraph) {
  const parts = [];
  const pattern = /\s?(?:\[\d+\])+/g;
  let last = 0;
  for (const match of paragraph.matchAll(pattern)) {
    if (match.index > last) {
      parts.push({ text: paragraph.slice(last, match.index), citation: false });
    }
    parts.push({ text: match[0], citation: true });
    last = match.index + match[0].length;
  }
  if (last < paragraph.length) {
    parts.push({ text: paragraph.slice(last), citation: false });
  }
  return parts;
}

// Screen readers should not read "bracket three bracket" mid-sentence.
export function stripCitations(paragraph) {
  return paragraph.replace(/\s?(?:\[\d+\])+/g, "");
}
