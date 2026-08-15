/**
 * Pure character-resolution logic extracted from app.js and practice.js,
 * the part of this tool that has actual decisions to get right, as
 * opposed to DOM wiring. Same load pattern as the sibling extensions in
 * this portfolio: a plain <script> global here, CommonJS under Jest.
 */
(function (root) {
  const CHINESE_RE = /[一-鿿㐀-䶿豈-﫿]/;

  const TONE_MARK_MAP = {
    'āáǎà': 'a', 'ēéěè': 'e', 'īíǐì': 'i', 'ōóǒò': 'o', 'ūúǔù': 'u', 'ǖǘǚǜ': 'u',
  };

  /** "nǐ" / "NǏ" / "ni3" -> "ni", strips tone diacritics and lowercases so
   * it can be looked up in PINYIN_MAP regardless of how the user typed it.
   * (Tone *numbers* are intentionally left alone, the pinyin maps in this
   * project are keyed without them, so a stray digit is a deliberate miss,
   * not something this function is responsible for stripping.) */
  function normalizePinyinInput(raw) {
    let out = raw.toLowerCase();
    for (const [marks, plain] of Object.entries(TONE_MARK_MAP)) {
      out = out.replace(new RegExp(`[${marks}]`, 'g'), plain);
    }
    return out;
  }

  /** Simplified -> traditional, single character. Falls back to the input
   * unchanged when there's no mapping (most CJK characters are unchanged
   * between scripts, or the char isn't in this project's mapping table). */
  function toScriptChar(char, useTraditional, simpToTrad) {
    if (!useTraditional) return char;
    return simpToTrad[char] || char;
  }

  /**
   * Resolve a search box's raw input to a single Chinese character:
   *   1. If the input contains a Han character, use the first one
   *      (converted to the active script).
   *   2. Otherwise, treat it as a pinyin syllable and look it up in the
   *      script-appropriate pinyin map.
   * Returns null when neither resolves, the caller shows an error state.
   */
  function resolveCharacterFromInput(raw, { useTraditional, simpToTrad, pinyinMap, pinyinMapTrad }) {
    for (const ch of raw) {
      if (CHINESE_RE.test(ch)) return toScriptChar(ch, useTraditional, simpToTrad);
    }
    const key = normalizePinyinInput(raw);
    const map = useTraditional ? pinyinMapTrad : pinyinMap;
    return map[key] || null;
  }

  /** Practice-mode end-of-quiz icon/text, separated from HanziWriter's
   * quiz summary object so it's testable without a HanziWriter instance. */
  function scoreLabel(mistakes, totalStrokes) {
    const perfect = mistakes === 0;
    const good = mistakes <= totalStrokes;
    return {
      icon: perfect ? '🏆' : good ? '👍' : '📝',
      text: perfect
        ? 'Perfect! No mistakes.'
        : `Done — ${mistakes} mistake${mistakes !== 1 ? 's' : ''} on ${totalStrokes} strokes`,
    };
  }

  const api = { CHINESE_RE, normalizePinyinInput, toScriptChar, resolveCharacterFromInput, scoreLabel };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CHAR_LOOKUP = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
