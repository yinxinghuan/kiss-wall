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
    hint_tap: 'KISS THE DARK · SOMETHING HIDES',
    kisses_n: '{n} kisses',
    kisses_zero: 'kiss the stone',
    seal_cta: 'REVEAL',
    seal_kissback: 'REVEAL DUET',
    sealing: 'developing the portrait…',
    curtain_developing: 'developing the portrait…',
    curtain_engraving:  'engraving the epitaph…',
    curtain_finishing:  'almost…',
    sealed: 'sealed',
    wall_title: 'OTHER PORTRAITS',
    wall_empty: 'no one else has revealed yet',
    wall_loading: 'gathering the night…',
    back: 'back',
    again: 'kiss another portrait',
    open_wall: 'wall',
    open_stele: 'portrait',
    inscribed_by: 'inscribed by',
    react_heart: 'breathe',
    kiss_back: 'KISS BACK',
    kissing_back: 'KISSING BACK ·',
    layered_over: 'a duet over',
    duet: 'DUET',
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
    hint_tap: '吻进黑暗 · 摸索藏在里面的形状',
    kisses_n: '{n} 个吻',
    kisses_zero: '吻这块碑',
    seal_cta: '显影',
    seal_kissback: '显影合奏',
    sealing: '正在显影这幅肖像…',
    curtain_developing: '正在显影这幅肖像…',
    curtain_engraving:  '正在镌刻题字…',
    curtain_finishing:  '快好了…',
    sealed: '已显影',
    wall_title: '其他肖像',
    wall_empty: '还没有人显影过',
    wall_loading: '在夜色里寻找…',
    back: '返回',
    again: '再吻一幅',
    open_wall: '墙',
    open_stele: '肖像',
    inscribed_by: '由',
    react_heart: '与之同呼吸',
    kiss_back: '回吻',
    kissing_back: '回吻 ·',
    layered_over: '叠覆在',
    duet: '合奏',
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
