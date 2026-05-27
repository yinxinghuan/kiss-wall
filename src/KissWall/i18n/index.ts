type Locale = 'zh' | 'en';

function detectLocale(): Locale {
  try {
    const override = localStorage.getItem('kiss-wall-locale');
    if (override === 'en' || override === 'zh') return override;
  } catch { /* private mode */ }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const LOCALE: Locale = detectLocale();

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    hint_tap: 'TAP THE STONE',
    kisses_n: '{n} kisses',
    kisses_zero: 'kiss the stone',
    seal_cta: 'SEAL',
    sealing: 'sealing your stele…',
    sealed: 'sealed',
    wall_title: 'OTHER STELAE',
    wall_empty: 'no one else has sealed yet',
    wall_loading: 'gathering the night…',
    back: 'back',
    again: 'kiss another stone',
    open_wall: 'wall',
    open_stele: 'stele',
    inscribed_by: 'inscribed by',
    epitaph_fallback: 'she kept coming back',
    bone: 'memento',
    heart: 'heart',
    bust: 'effigy',
    eye: 'the eye',
    hand: 'reach',
    rose: 'rose',
    veil: 'veil',
    wings: 'wings',
  },
  zh: {
    hint_tap: '吻这块碑',
    kisses_n: '{n} 个吻',
    kisses_zero: '吻这块碑',
    seal_cta: '封印',
    sealing: '正在封印这块碑…',
    sealed: '已封印',
    wall_title: '其他人的碑',
    wall_empty: '还没有人封印过',
    wall_loading: '在夜色里寻找…',
    back: '返回',
    again: '再吻一块',
    open_wall: '墙',
    open_stele: '碑',
    inscribed_by: '由',
    epitaph_fallback: '她回来了不止一次',
    bone: '骨',
    heart: '心',
    bust: '雕像',
    eye: '眼',
    hand: '手',
    rose: '玫瑰',
    veil: '面纱',
    wings: '羽翼',
  },
};

export function t(key: string, vars?: { n?: number | string }): string {
  let s = STRINGS[LOCALE][key] ?? STRINGS.en[key] ?? key;
  if (vars?.n != null) s = s.replace('{n}', String(vars.n));
  return s;
}

export function getLocale(): Locale {
  return LOCALE;
}
