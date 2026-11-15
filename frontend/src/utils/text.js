/** Replace typographic characters AI tends to produce with what a keyboard can type. */
const CHAR_MAP = {
  // curly single quotes / apostrophes / prime
  "\u2018": "'", // '
  "\u2019": "'", // '
  "\u201A": "'", // ‚
  "\u201B": "'", // ‛
  "\u2032": "'", // ′
  "\u02BC": "'", // ʼ
  // curly double quotes
  "\u201C": '"', // "
  "\u201D": '"', // "
  "\u201E": '"', // „
  "\u201F": '"', // ‟
  "\u2033": '"', // ″
  // dashes and minus
  "\u2010": "-", // hyphen
  "\u2011": "-", // non-breaking hyphen
  "\u2012": "-", // figure dash
  "\u2013": "-", // en dash
  "\u2014": "-", // em dash
  "\u2015": "-", // horizontal bar
  "\u2212": "-", // minus sign
  // ellipsis
  "\u2026": "...",
  // spaces
  "\u00A0": " ", // non-breaking space
  "\u2002": " ",
  "\u2003": " ",
  "\u2009": " ",
  "\u202F": " ",
  // zero-width / invisible characters
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\uFEFF": "",
};

const CHAR_REGEX = new RegExp(`[${Object.keys(CHAR_MAP).join("")}]`, "g");

export const normalizeText = (str) =>
  String(str).replace(CHAR_REGEX, (c) => CHAR_MAP[c]);

/** Session payload from the API -> the tokens the typing test renders. */
export function toTokens(session) {
  if (session.mode === "words") {
    // [word, translation]: only index 0 is typed, index 1 is shown as a coloured hint
    return session.items.map(([target, hint]) => ({
      target: normalizeText(target),
      hint,
    }));
  }
  // sentences: type them word by word, punctuation included
  return session.items.flatMap((sentence) =>
    normalizeText(sentence)
      .split(/\s+/)
      .filter(Boolean)
      .map((target) => ({ target })),
  );
}

// "der Tisch | the table"  (also accepts =  ;  tab  or " - " as separator)
const SEPARATOR = /\s*(?:\||=|;|\t| - )\s*/;

export function parseWords(text) {
  const pairs = [];
  const badLines = [];
  normalizeText(text)
    .split("\n")
    .forEach((raw, i) => {
      const line = raw.trim();
      if (!line) return;
      const m = SEPARATOR.exec(line);
      const word = m ? line.slice(0, m.index).trim() : "";
      const translation = m ? line.slice(m.index + m[0].length).trim() : "";
      if (word && translation) pairs.push([word, translation]);
      else badLines.push(i + 1);
    });
  return { pairs, badLines };
}

export const parseSentences = (text) =>
  normalizeText(text)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
