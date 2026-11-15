import { Lexend_Deca, Permanent_Marker } from 'next/font/google';

/**
 * The Microfox brand kit's two faces (brandguide.md › Type): Lexend Deca for everything set in
 * type, Permanent Marker for one- or two-word accents only. The homepage puts both on its root
 * (see `.mf-site` in app/globals.css).
 */
const lexendDeca = Lexend_Deca({
  variable: '--font-lexend-deca',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

const permanentMarker = Permanent_Marker({
  variable: '--font-permanent-marker',
  subsets: ['latin'],
  weight: '400',
});

export const homeFonts = `${lexendDeca.variable} ${permanentMarker.variable}`;
