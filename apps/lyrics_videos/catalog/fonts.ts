/**
 * Step 2 of the storyboard: font sets for the lyrics (and the title card). Older mediamake
 * timelines set fonts as `fontChoices` (headerFont = the highlight, primaryFont = the rest), the
 * newer ones as text styles; both are counted from the read-only export of 2026-10-24. Fonts are
 * Google fonts by family name ('RacingSansOne', 'Roboto:600:italic').
 * Shots: out/waveform-catalog/fonts/<id>.jpg (npm run wave-lab -w lyrics_videos -- catalog fonts).
 */
import type { CatalogEntry, FontSet, TextStyle } from '../src/mediamake/look';

const caps = (font: string, extra: TextStyle = {}): TextStyle => ({
  font,
  textTransform: 'uppercase',
  letterSpacing: '0em',
  textScale: 1,
  ...extra,
});
const title = (font: string, extra: TextStyle = {}): TextStyle => caps(font, { textTransform: 'capitalize', ...extra });
const white = (accent: string) => ({ primary: '#ffffff', secondary: '#ffffff', accent });

export const FONTS = {
  'bebas-roboto': {
    name: 'Bebas Neue / Roboto italic',
    about: "The caption preset's own defaults: tall condensed caps for the hero word, a bold italic for the rest.",
    tags: ['default', 'clean', 'any song'],
    source: 'mediamake: sub-vertical-float defaults; vegetassj-instrumental-levels, k (2025-12 → 2026-09)',
    value: {
      highlight: caps('BebasNeue', { letterSpacing: '0.04em', textScale: 1.35 }),
      sub: caps('Roboto:600:italic', { textScale: 0.85 }),
      colors: white('#ff6b6b'),
    },
  },
  'racing-schoolbell': {
    name: 'Racing Sans / Schoolbell',
    about: 'A fast italic display word over a light handwritten line. The most used pairing in the old lyric videos.',
    tags: ['anime', 'hype', 'playful'],
    source: 'mediamake: 18 caption tracks (fontChoices, 2025-10 → 2026-09)',
    value: { highlight: caps('RacingSansOne'), sub: caps('Schoolbell'), colors: white('#ffbb00') },
  },
  'racing-fugaz': {
    name: 'Racing Sans / Fugaz One',
    about: 'Two heavy italic display faces: everything leans forward.',
    tags: ['anime', 'sport', 'fast', 'rap'],
    source: 'mediamake: 16 caption tracks (fontChoices)',
    value: { highlight: caps('RacingSansOne'), sub: caps('FugazOne'), colors: white('#ffbb00') },
  },
  'cinzel-racing': {
    name: 'Cinzel Decorative / Racing Sans',
    about: 'An ornate classical capital for the hero word over a fast italic line: myth meets speed.',
    tags: ['epic', 'anime', 'fantasy'],
    source: 'mediamake: bony-lyrics and 4 more (fontChoices, 2026-10)',
    value: { highlight: caps('CinzelDecorative'), sub: caps('RacingSansOne'), colors: white('#ffffff') },
  },
  fugaz: {
    name: 'Fugaz One',
    about: 'One heavy italic face for the whole line.',
    tags: ['sport', 'hype'],
    source: 'mediamake: 5 caption tracks (fontChoices)',
    value: { highlight: caps('FugazOne'), sub: caps('FugazOne'), colors: white('#f97316') },
  },
  tradewinds: {
    name: 'Trade Winds',
    about: 'A pirate-poster display face, rough and theatrical.',
    tags: ['adventure', 'pirate', 'theatrical'],
    source: 'mediamake: 5 caption tracks (fontChoices), warmup-only-lyrics',
    value: { highlight: caps('TradeWinds'), sub: caps('TradeWinds'), colors: white('#ffffff') },
  },
  'tradewinds-racing': {
    name: 'Trade Winds / Racing Sans',
    about: 'Trade Winds for the hero word over a fast italic line.',
    tags: ['adventure', 'anime'],
    source: "mediamake: 7 caption tracks (fontChoices), the editor's default pair in 2026",
    value: { highlight: caps('TradeWinds'), sub: caps('RacingSansOne'), colors: white('#e11d48') },
  },
  bangers: {
    name: 'Bangers',
    about: 'Comic-book caps.',
    tags: ['comic', 'fun', 'anime'],
    source: 'mediamake: wakuwaku christmas and 3 more (fontChoices)',
    value: { highlight: caps('Bangers', { letterSpacing: '0.04em' }), sub: caps('Bangers'), colors: white('#facc15') },
  },
  rozha: {
    name: 'Rozha One',
    about: 'A high-contrast heavy serif, set in capitalised words. Letters for a love letter.',
    tags: ['love', 'ballad', 'elegant'],
    source: 'mediamake: nami-fanletter-lyrics and 3 more (fontChoices, 2025-12)',
    value: { highlight: title('RozhaOne'), sub: title('RozhaOne'), colors: white('#fda4af') },
  },
  'saira-ysabeau': {
    name: 'Saira Stencil / Ysabeau',
    about: 'A military stencil for the hero word over a soft humanist line.',
    tags: ['war', 'motivation', 'speech'],
    // The timelines named it SairaStencilOne, which no font package has: they fell back to a system font.
    source: 'mediamake: standingali-finalproject (sub-kinetic-motion, 2025-10)',
    value: { highlight: caps('SairaStencil'), sub: caps('Ysabeau'), colors: white('#ff6b6b') },
  },
  'uncial-pirata': {
    name: 'Uncial Antiqua / Pirata One',
    about: 'Medieval uncials over a blackletter: legends, swords, old gods.',
    tags: ['fantasy', 'medieval', 'epic'],
    source: 'mediamake: whitebeard-final and 2 more (fontChoices, 2025-10)',
    value: { highlight: caps('UncialAntiqua'), sub: title('PirataOne'), colors: white('#ffffff') },
  },
  'zendots-fugaz': {
    name: 'Zen Dots / Fugaz One',
    about: 'A wide techno face over a heavy italic.',
    tags: ['tech', 'sci-fi', 'edm'],
    source: 'mediamake: 3 caption tracks (fontChoices)',
    value: { highlight: caps('ZenDots'), sub: caps('FugazOne'), colors: white('#22d3ee') },
  },
  'michroma-fugaz': {
    name: 'Michroma / Fugaz One',
    about: 'Michroma\'s wide extended caps for the hero word, a heavy italic for the rest.',
    tags: ['tech', 'racing', 'hype'],
    source: 'mediamake: 3 caption tracks (fontChoices)',
    value: { highlight: caps('Michroma'), sub: caps('FugazOne'), colors: white('#f97316') },
  },
  'rocksalt-novasquare': {
    name: 'Rock Salt / Nova Square',
    about: 'A scrawled marker hero word over a square techno line.',
    tags: ['grunge', 'anime', 'edgy'],
    source: 'mediamake: shonobu-lyrics and 1 more (fontChoices, 2026-01)',
    value: { highlight: caps('RockSalt'), sub: caps('NovaSquare'), colors: { primary: '#ffffff', secondary: '#ff0000', accent: '#ffffff' } },
  },
  'protest-oswald': {
    name: 'Protest Revolution / Oswald',
    about: 'A brushed protest-poster face over a narrow grotesk.',
    tags: ['rebel', 'rap', 'raw'],
    source: 'mediamake: jiren-lyric-video, kingofpirates-lyrical (fontChoices, 2025-10)',
    value: { highlight: caps('ProtestRevolution'), sub: caps('Oswald'), colors: white('#ffffff') },
  },
  courgette: {
    name: 'Courgette',
    about: 'A warm brush script in capitalised words.',
    tags: ['love', 'pop', 'warm'],
    source: 'mediamake: supermel-iamthbrave and 1 more (fontChoices, 2026-01)',
    value: { highlight: title('Courgette'), sub: title('Courgette'), colors: white('#ffffff') },
  },
  'stalinist-fugaz': {
    name: 'Stalinist One / Fugaz One',
    about: 'A massive slab-stencil hero word, tracked wide, over a heavy italic.',
    tags: ['sport', 'hype', 'anime'],
    source: 'mediamake: isagi-lyrics (sub-fast-rap-static, 2026-03)',
    value: { highlight: caps('StalinistOne', { letterSpacing: '0.1em' }), sub: caps('FugazOne'), colors: white('#86D4F2') },
  },
  'metalmania-bebas': {
    name: 'Metal Mania / Bebas Neue',
    about: 'A heavy-metal hero word that spaces out letter by letter, over glowing condensed caps.',
    tags: ['anime', 'dark', 'metal', 'villain'],
    source: 'mediamake: garou-beyondmonster (2026-10)',
    // the wide hero-word spacing is made for the letter-space animations
    shotWith: { captions: 'letterspace-float-2' },
    value: {
      highlight: caps('MetalMania', { textScale: 1.1, letterSpacing: '2.5em', isGlowEnabled: true }),
      sub: caps('BebasNeue', { textTransform: 'capitalize', letterSpacing: '0.15em', isGlowEnabled: true }),
      colors: { primary: '#f6f1f1', secondary: '#ffffff', accent: '#c90202ef' },
    },
  },
  'michroma-aldrich': {
    name: 'Michroma / Aldrich',
    about: 'Wide extended tech caps over a squared sans, both glowing; the hero word spaces out.',
    tags: ['anime', 'tech', 'cold'],
    source: 'mediamake: itachi-inexorable (2026-10)',
    shotWith: { captions: 'sentence-letterspace-2' },
    value: {
      highlight: caps('Michroma', { textScale: 1.3, letterSpacing: '2.5em', isGlowEnabled: true }),
      sub: caps('Aldrich', { letterSpacing: '0.15em', isGlowEnabled: true }),
      colors: { primary: '#f6f1f1', secondary: '#ffffff', accent: '#c90202ef' },
      sizeScale: 0.6,
    },
  },
  'handwritten-quicksand': {
    name: 'Nothing You Could Do / Quicksand',
    about: 'A thin handwriting hero word over a rounded sans, pink glow.',
    tags: ['anime', 'cute', 'tender'],
    source: 'mediamake: nezuko-lyrics (2026-10)',
    shotWith: { captions: 'letterspace-float-2' },
    value: {
      highlight: title('NothingYouCouldDo', { textScale: 1.3, letterSpacing: '2.5em', isGlowEnabled: true }),
      sub: title('Quicksand', { letterSpacing: '0.05em', isGlowEnabled: true }),
      colors: { primary: '#f6f1f1', secondary: '#ffffff', accent: '#ec4899bc' },
    },
  },
  'poiret-quicksand': {
    name: 'Poiret One / Quicksand',
    about: 'Thin art-deco caps over smaller rounded caps, no glow. Quiet and airy.',
    tags: ['love', 'ballad', 'minimal'],
    source: 'mediamake: The Day I Saw You (Love Note, 2026-10)',
    value: {
      highlight: caps('PoiretOne'),
      sub: caps('Quicksand', { textScale: 0.8 }),
      colors: { primary: '#ffffff', secondary: '#ffffff', accent: '#00000000' },
    },
  },
  'novaflat-novaoval': {
    name: 'Nova Flat / Nova Oval',
    about: 'Two quirky geometric display faces, capitalised, one sentence-case line.',
    tags: ['sultry', 'pop', 'r&b'],
    source: 'mediamake: youcanhavekingdom (INVERTED Devils, 2026-10)',
    value: {
      highlight: { font: 'NovaFlat', textTransform: 'capitalize', letterSpacing: '0.04em', textScale: 1 },
      sub: { font: 'NovaOval', textTransform: 'none', letterSpacing: '0em', textScale: 1 },
      colors: { primary: '#ffffff', secondary: '#ffffff', accent: '#ff6b6b' },
    },
  },
  ramabhadra: {
    name: 'Ramabhadra (Telugu)',
    about: 'A bold Telugu display face for devotional songs; highlight words only where the lyrics bold them.',
    tags: ['telugu', 'devotional'],
    source: 'mediamake: Ayyappa, Akhilanda Natha, ChittiGanapayya, barghavive (Subhodayam, 2026-10)',
    value: {
      highlight: caps('Ramabhadra'),
      sub: caps('Ramabhadra'),
      colors: { primary: '#ffffff', secondary: '#ffffff', accent: '' },
      sample: 'ఓం నమః శివాయ శివాయ నమః',
    },
  },

  // Brand and new pairings, 2026-10-25
  'calligraffitti-bebas': {
    name: 'Calligraffitti / Bebas Neue (INVERTED Devils)',
    about: "The INVERTED Devils logo's two fonts: a handwritten script hero word over tall condensed caps.",
    tags: ['inverted devils', 'sultry', 'r&b'],
    source: 'new 2026-10-25: the brand fonts of brands/inverteddevils',
    value: {
      highlight: title('Calligraffitti', { textScale: 1.25, isGlowEnabled: true }),
      sub: caps('BebasNeue', { letterSpacing: '0.12em' }),
      colors: { primary: '#ffffff', secondary: '#ffffff', accent: '#e11d48' },
    },
  },
  dhurjati: {
    name: 'Dhurjati (Telugu, Subhodayam)',
    about: "The Subhodayam logo's Telugu face: lighter and rounder than Ramabhadra.",
    tags: ['telugu', 'devotional', 'subhodayam'],
    source: 'new 2026-10-25: the brand font of brands/subhodayam',
    value: {
      highlight: caps('Dhurjati', { textScale: 1.15 }),
      sub: caps('Dhurjati'),
      colors: { primary: '#fff7ed', secondary: '#fff7ed', accent: '#f97316' },
      sample: 'శుభోదయం సూర్య నమస్కారం',
    },
  },
  'michroma-inter': {
    name: 'Michroma / Inter (ATOMIC RAP)',
    about: "ATOMIC RAP's wide tech caps for the hero word, a plain strong sans for the rest.",
    tags: ['atomic rap', 'rap', 'tech'],
    source: 'new 2026-10-25: the brand font of brands/atomicrap',
    value: {
      highlight: caps('Michroma', { letterSpacing: '0.2em', textScale: 1.1 }),
      sub: caps('Inter:700', { letterSpacing: '0.04em', textScale: 0.9 }),
      colors: white('#38bdf8'),
      sizeScale: 0.8,
    },
  },
  'anton-inter': {
    name: 'Anton / Inter',
    about: 'A tall heavy grotesk hero word over a clean sans. Loud and modern, reads at any size.',
    tags: ['rap', 'trap', 'modern', 'bold'],
    source: 'new 2026-10-25',
    value: {
      highlight: caps('Anton', { letterSpacing: '0.02em', textScale: 1.3 }),
      sub: caps('Inter:600', { letterSpacing: '0.02em', textScale: 0.85 }),
      colors: white('#facc15'),
    },
  },
  'cormorant-montserrat': {
    name: 'Cormorant italic / Montserrat',
    about: 'An elegant italic serif for the hero word over light, wide-tracked caps.',
    tags: ['love', 'ballad', 'classical', 'elegant'],
    source: 'new 2026-10-25',
    value: {
      highlight: title('CormorantGaramond:600:italic', { textScale: 1.45 }),
      sub: caps('Montserrat:300', { letterSpacing: '0.25em', textScale: 0.7 }),
      colors: white('#fde68a'),
    },
  },
  'marker-oswald': {
    name: 'Permanent Marker / Oswald',
    about: 'A street marker hero word over narrow caps: graffiti on a poster.',
    tags: ['street', 'rap', 'grunge', 'punk'],
    source: 'new 2026-10-25',
    value: {
      highlight: title('PermanentMarker', { textScale: 1.25 }),
      sub: caps('Oswald', { letterSpacing: '0.06em' }),
      colors: white('#a3e635'),
    },
  },
  'playfair-lato': {
    name: 'Playfair italic / Lato',
    about: 'An editorial italic serif over a friendly sans, in sentence case.',
    tags: ['pop', 'acoustic', 'indie', 'soft'],
    source: 'new 2026-10-25',
    value: {
      highlight: { font: 'PlayfairDisplay:700:italic', textTransform: 'none', letterSpacing: '0em', textScale: 1.3 },
      sub: { font: 'Lato:400', textTransform: 'none', letterSpacing: '0.02em', textScale: 0.9 },
      colors: white('#f9a8d4'),
    },
  },
} satisfies Record<string, CatalogEntry<FontSet>>;
