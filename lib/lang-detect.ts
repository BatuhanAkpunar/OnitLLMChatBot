/**
 * Lightweight client-side language detector for chat messages. Deliberately
 * conservative: returns "tr" or "en" only when there is a clear signal, and
 * `null` when the text is too short/ambiguous (e.g. "ok", "@QA", a product
 * name). Callers keep the current conversation language on `null`, so a switch
 * is only announced on a confident change, never on noise.
 */
export type DetectedLang = "tr" | "en";

const TR_CHARS = /[ışğçöüİ]/i; // ı, ş, ğ and İ are Turkish-specific
const TR_WORDS =
  /\b(ve|bir|için|bu|şu|ben|sen|biz|nasıl|neden|ne|mı|mi|mu|mü|değil|var|yok|çok|daha|ama|veya|ile|gibi|kadar|önce|sonra|lütfen|merhaba|teşekkür|evet|hayır|yap|olsun|istiyorum|yapar|mısın)\b/i;
const EN_WORDS =
  /\b(the|a|an|is|are|was|were|you|your|this|that|what|how|why|with|and|or|for|please|hello|thanks|thank|yes|no|make|want|can|could|should|would|need|write|build|create|add)\b/i;

/**
 * Returns the detected language, or null when the signal is too weak to be sure.
 */
export function detectLang(text: string): DetectedLang | null {
  const t = (text ?? "").trim();
  // Strip @mentions and skip very short inputs: not enough to judge.
  const words = t.replace(/@\w+/g, " ").trim();
  if (words.replace(/[^\p{L}]/gu, "").length < 4) return null;

  // Strong Turkish signal: Turkish-only letters or a Turkish stopword.
  if (TR_CHARS.test(words) || TR_WORDS.test(words)) return "tr";
  if (EN_WORDS.test(words)) return "en";
  return null;
}
