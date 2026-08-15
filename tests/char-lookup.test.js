const {
  normalizePinyinInput,
  toScriptChar,
  resolveCharacterFromInput,
  scoreLabel,
} = require('../frontend/js/lib/char-lookup');

const PINYIN_MAP = { ni: '你', hao: '好', wo: '我' };
const PINYIN_MAP_TRAD = { ...PINYIN_MAP, guo: '國' };
const SIMP_TO_TRAD = { 国: '國', 学: '學' };

describe('normalizePinyinInput', () => {
  test('strips tone diacritics', () => {
    expect(normalizePinyinInput('nǐ')).toBe('ni');
    expect(normalizePinyinInput('hǎo')).toBe('hao');
  });

  test('lowercases', () => {
    expect(normalizePinyinInput('NǏ')).toBe('ni');
  });

  test('handles every tone class (1st-4th) across all five vowels', () => {
    expect(normalizePinyinInput('āáǎà ēéěè īíǐì ōóǒò ūúǔù ǖǘǚǜ')).toBe('aaaa eeee iiii oooo uuuu uuuu');
  });

  test('plain ASCII input passes through unchanged', () => {
    expect(normalizePinyinInput('nihao')).toBe('nihao');
  });
});

describe('toScriptChar', () => {
  test('simplified mode returns the character unchanged', () => {
    expect(toScriptChar('国', false, SIMP_TO_TRAD)).toBe('国');
  });

  test('traditional mode converts a mapped character', () => {
    expect(toScriptChar('国', true, SIMP_TO_TRAD)).toBe('國');
  });

  test('traditional mode leaves an unmapped character unchanged', () => {
    expect(toScriptChar('你', true, SIMP_TO_TRAD)).toBe('你');
  });
});

describe('resolveCharacterFromInput', () => {
  const opts = { useTraditional: false, simpToTrad: SIMP_TO_TRAD, pinyinMap: PINYIN_MAP, pinyinMapTrad: PINYIN_MAP_TRAD };

  test('a Chinese character in the input is used directly', () => {
    expect(resolveCharacterFromInput('你', opts)).toBe('你');
  });

  test('only the first Chinese character in mixed input is used', () => {
    expect(resolveCharacterFromInput('x你好', opts)).toBe('你');
  });

  test('pinyin input resolves via the map', () => {
    expect(resolveCharacterFromInput('ni', opts)).toBe('你');
  });

  test('toned pinyin input is normalized before lookup', () => {
    expect(resolveCharacterFromInput('nǐ', opts)).toBe('你');
  });

  test('traditional mode converts a Han character result', () => {
    const tradOpts = { ...opts, useTraditional: true };
    expect(resolveCharacterFromInput('国', tradOpts)).toBe('國');
  });

  test('traditional mode uses the traditional pinyin map', () => {
    const tradOpts = { ...opts, useTraditional: true };
    expect(resolveCharacterFromInput('guo', tradOpts)).toBe('國');
  });

  test('unresolvable input returns null', () => {
    expect(resolveCharacterFromInput('xyz123', opts)).toBeNull();
  });
});

describe('scoreLabel', () => {
  test('zero mistakes is a perfect score', () => {
    expect(scoreLabel(0, 5)).toEqual({ icon: '🏆', text: 'Perfect! No mistakes.' });
  });

  test('mistakes at or under stroke count is a "good" score', () => {
    const { icon, text } = scoreLabel(3, 5);
    expect(icon).toBe('👍');
    expect(text).toBe('Done — 3 mistakes on 5 strokes');
  });

  test('mistakes over stroke count is not a "good" score', () => {
    const { icon } = scoreLabel(8, 5);
    expect(icon).toBe('📝');
  });

  test('singular "mistake" is not pluralized', () => {
    const { text } = scoreLabel(1, 5);
    expect(text).toContain('1 mistake on');
    expect(text).not.toContain('1 mistakes');
  });
});
