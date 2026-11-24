'use client';

// The pictures here are small SVG marks and the store's own headshots, served as they are.
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Providers } from '@/components/auth/provider-buttons';
import { bringToLife } from './life';
import { SetupToast, SignInPopup, type SignInTarget } from './popups';
import type { HomeShelf } from './shelf';
import './landing.css';

/** Inline styles here carry CSS custom properties (--o, --n, --h…), which React's style type doesn't list. */
const css = (style: Record<string, string>) => style as CSSProperties;

/** GitHub's mark, in the header and on Continue with GitHub. */
const GITHUB =
  'M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z';

/** The store is Explore, in the app: each kind of item opens its own list there. */
const EXPLORE = {
  all: { href: '/app/explore', what: 'the store' },
  skill: { href: '/app/explore?kind=skill', what: 'Skills' },
  mcp: { href: '/app/explore?kind=mcp', what: 'MCPs' },
  app: { href: '/app/explore?kind=app', what: 'Apps' },
  home: { href: '/app', what: 'the app' },
} satisfies Record<string, SignInTarget>;

/**
 * The homepage: a scroll story in six chapters. Each chapter opens on a full-screen stage where its
 * title lights up word by word, then hands over to one piece of UI. The markup is all here and complete
 * without script; what moves (the typing, the wheel, the words lighting up) is life.ts, and every style is
 * landing.css, scoped under .mmh. The store's numbers and pictures come from the live catalog (shelf.ts).
 * Every way into the app (the store's kinds, Enter app) asks a signed-out visitor to sign in right here
 * (popups.tsx), and copying the setup prompt says what to do with it next.
 */
export function Landing({ counts, shelf, ledger, signedIn, providers }: HomeShelf & { signedIn: boolean; providers: Providers }) {
  const root = useRef<HTMLDivElement>(null);
  // the copied note: its count (0, none) restarts it on every copy
  const [toast, setToast] = useState({ shown: 0, copied: true });
  const [signIn, setSignIn] = useState<SignInTarget | null>(null);
  const closeToast = useCallback(() => setToast(current => ({ ...current, shown: 0 })), []);
  useEffect(() => {
    if (!root.current) return;
    return bringToLife(root.current, { onCopied: copied => setToast(current => ({ shown: current.shown + 1, copied })) });
  }, []);

  /** A link into the app: signed out, it opens the sign-in here instead. */
  const into = (target: SignInTarget) => ({
    href: target.href,
    onClick: (e: React.MouseEvent) => {
      if (signedIn || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      setSignIn(target);
    },
  });

  return (
    <div className="mmh" ref={root}>
      <svg className="sprite" aria-hidden="true">
        <symbol id="i-cursor" viewBox="0 0 24 24"><path d="M5 4l14 6.5-6.2 1.8L11 18.5z"/></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
        <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
        <symbol id="i-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
        <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 017.5 4H15"/></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
        <symbol id="i-grip" viewBox="0 0 24 24"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" strokeWidth="2.6"/></symbol>
        <symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></symbol>
        <symbol id="i-code" viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path d="M5 5h14a1 1 0 011 1v10a1 1 0 01-1 1h-8l-5 4v-4H5a1 1 0 01-1-1V6a1 1 0 011-1z"/></symbol>
        {/* the eight kinds of work */}
        <symbol id="i-palette" viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18c1.2 0 1.9-.9 1.9-1.9 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4C21 6.4 17 3 12 3z"/><path d="M7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01" strokeWidth="2.6"/></symbol>
        <symbol id="i-scissors" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.2 7.6L20 18M8.2 16.4L20 6"/></symbol>
        <symbol id="i-zap" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></symbol>
        <symbol id="i-shapes" viewBox="0 0 24 24"><circle cx="7.5" cy="16.5" r="4"/><rect x="13.5" y="12.5" width="7.5" height="7.5" rx="1.5"/><path d="M12 3l4.6 7.2H7.4z"/></symbol>
        <symbol id="i-type" viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></symbol>
        <symbol id="i-cube" viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5"/></symbol>
        <symbol id="i-game" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7.5 10v4M5.5 12h4"/><path d="M15.5 11h.01M18 13.5h.01" strokeWidth="2.6"/></symbol>
        <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.7"/><path d="M21 15.5l-5-5-8.5 8.5"/></symbol>
        {/* what the store holds, what is in the repo */}
        <symbol id="i-book" viewBox="0 0 24 24"><path d="M5 4.5h11a3 3 0 013 3V20H8a3 3 0 01-3-3z"/><path d="M9 9h6M9 13h6"/></symbol>
        <symbol id="i-plug" viewBox="0 0 24 24"><path d="M9 2.5V8M15 2.5V8M6 8h12v3a6 6 0 01-12 0zM12 17v4.5"/></symbol>
        <symbol id="i-window" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8.5 14.5l2.5 2.5 4.5-5"/></symbol>
        <symbol id="i-film" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/></symbol>
        <symbol id="i-blocks" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.8"/><rect x="13" y="3" width="8" height="8" rx="1.8"/><rect x="3" y="13" width="8" height="8" rx="1.8"/><path d="M17 13.5v7M13.5 17h7"/></symbol>
        <symbol id="i-chip" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/></symbol>
        <symbol id="i-sign" viewBox="0 0 24 24"><path d="M12 3v18M12 5.5h6.5l2 2.5-2 2.5H12M12 12.5H5.5l-2 2.5 2 2.5H12"/></symbol>
        <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V17a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></symbol>
        <symbol id="i-file" viewBox="0 0 24 24"><path d="M7 3h7l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M14 3v4h4"/></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
        <symbol id="i-github" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d={GITHUB}/></symbol>
      </svg>

      <div className="page" id="top">

      <header className="nav">
        <div className="wrap"><div className="nav__in">
          <a className="brand" href="#top"><img src="/brand/mediamake-mark.svg" alt="" /><span>MediaMake</span></a>
          <nav className="nav__links" aria-label="Chapters">
            <a href="#make">What it makes</a>
            <a href="#store">Store</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="nav__cta">
            <a className="nav__gh" href="https://github.com/microfox-ai/mediamake" aria-label="MediaMake on GitHub" target="_blank" rel="noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={GITHUB}/></svg></a>
            <button className="nav__gh nav__copy" type="button" id="copy-setup-nav" data-copy="setup" aria-label="Copy Setup Instruction" data-tip="Copy Setup Instruction"><svg className="ic" aria-hidden="true"><use href="#i-copy"/></svg><svg className="ic ic--done" aria-hidden="true"><use href="#i-check"/></svg></button>
            <Link className="btn btn--light btn--sm" {...into(EXPLORE.home)}>Enter app</Link>
          </div>
        </div></div>
      </header>

      <main>

      {/* HERO: the lit prompt box, inside the agent you already use */}
      <section className="hero">
        <div className="hero__bloom"></div>
        <div className="wrap hero__in">
          <p className="chip"><i></i>Open source · 50+ skills, MCPs and apps</p>
          <h1 aria-label="The open-source AI store for solo creators"><span aria-hidden="true">The <span className="nb">open-source</span> AI store</span><span aria-hidden="true">for <span className="swap" id="swap"><em className="spec" id="who">solo</em><i className="caret"></i></span> creators</span></h1>
          <p className="lead">A suite of skills, MCPs and apps you drive from Claude Code, Codex or Antigravity. Say what you want made. You review every result before it is final.</p>

          <div className="composer">
            <div className="composer__bar" aria-hidden="true">
              <span className="atab on"><span className="ag"><img src="/home/agents/claude.svg" alt="" /></span><b>Claude Code</b></span>
              <span className="atab"><span className="ag"><img src="/home/agents/codex.svg" alt="" /></span><b>Codex</b></span>
              <span className="atab"><span className="ag"><img src="/home/agents/antigravity.svg" alt="" /></span><b>Antigravity</b></span>
              <span className="sq"><svg className="ic"><use href="#i-plus"/></svg></span>
            </div>
            <div className="glow composer__box">
              <p className="composer__text"><span className="vh">Example request: </span><span id="typed">Re-edit this match footage into a hype reel.</span><span className="caret" aria-hidden="true"></span></p>
              <div className="composer__foot" aria-hidden="true">
                <span className="model"><span className="ag"><img id="agent-ico" src="/home/agents/claude.svg" alt="" /></span><span id="agent-name">Claude Code</span> <svg className="ic"><use href="#i-chev"/></svg></span>
                <span className="tools">
                  <span className="tool tool--on"><svg className="ic"><use href="#i-cursor"/></svg></span>
                  <span className="tool"><svg className="ic"><use href="#i-plus"/></svg></span>
                  <span className="tool"><svg className="ic"><use href="#i-up"/></svg></span>
                </span>
              </div>
            </div>
          </div>

          <div className="cta">
            <button className="btn btn--light" type="button" id="copy-setup-hero" data-copy="setup"><svg className="ic"><use href="#i-copy"/></svg><span data-label="">Copy the setup prompt</span></button>
            <a className="btn btn--line" href="#store">Browse the store <svg className="ic"><use href="#i-arrow"/></svg></a>
          </div>
          <p className="fine">Completely free and open source. Paste the prompt into your agent and it sets everything up.</p>
        </div>
      </section>

      {/* 01 */}
      <section className="chapter" id="make">
        <div className="words" data-story="">
          <div className="words__stage">
            <h2 className="big"><span className="w">Say</span> <span className="w">what</span> <span className="w">you</span> <span className="w">want</span> <span className="w w--spec">made.</span></h2>
            <div className="wrap words__meta"><span><b>01</b> / 06</span><span>what it makes</span></div>
          </div>
        </div>

        <div className="reel" id="reel">
          <div className="reel__stage">
            <div className="wrap reel__grid">
              <div>
                <ul className="wheel" aria-label="Eight kinds of work">
                  <li className="wheel__line on" style={css({ '--o': '0', '--s': '1', '--a': '1' })}><svg className="ic"><use href="#i-palette"/></svg>A brand kit</li>
                  <li className="wheel__line" style={css({ '--o': '1', '--s': '.89', '--a': '.66' })}><svg className="ic"><use href="#i-scissors"/></svg>A video edit</li>
                  <li className="wheel__line" style={css({ '--o': '2', '--s': '.78', '--a': '.32' })}><svg className="ic"><use href="#i-zap"/></svg>A hype reel re-edit</li>
                  <li className="wheel__line" style={css({ '--o': '3', '--s': '.67', '--a': '0' })}><svg className="ic"><use href="#i-shapes"/></svg>Motion graphics</li>
                  <li className="wheel__line" style={css({ '--o': '4', '--s': '.67', '--a': '0' })}><svg className="ic"><use href="#i-type"/></svg>Kinetic type</li>
                  <li className="wheel__line" style={css({ '--o': '5', '--s': '.67', '--a': '0' })}><svg className="ic"><use href="#i-cube"/></svg>3D renders</li>
                  <li className="wheel__line" style={css({ '--o': '6', '--s': '.67', '--a': '0' })}><svg className="ic"><use href="#i-game"/></svg>Games</li>
                  <li className="wheel__line" style={css({ '--o': '7', '--s': '.67', '--a': '0' })}><svg className="ic"><use href="#i-image"/></svg>Thumbnails</li>
                </ul>
                <p className="reel__meta" aria-hidden="true"><span><b id="reel-n">1</b> of 8</span><span id="reel-note">logo, type, colour</span></p>
              </div>

              <div className="screen">
                <div className="bar" aria-hidden="true"><svg className="ic"><use href="#i-grip"/></svg><b>Canvas</b> made by your agent <span className="bar__plus"><svg className="ic"><use href="#i-plus"/></svg></span></div>
                <div className="frame" id="reel-frame">
                  <div className="art on"><div className="art__box"><div className="bk">
                    <img src="/brand/mediamake-mark.svg" alt="The MediaMake mark" />
                    <div className="bk__aa">Aa<small>Afacad Flux · 700</small></div>
                    <div className="bk__sw" aria-hidden="true"><i style={css({ '--n': '0', background: '#f7931e' })}></i><i style={css({ '--n': '1', background: '#e6332d' })}></i><i style={css({ '--n': '2', background: '#e91e63' })}></i><i style={css({ '--n': '3', background: '#661455' })}></i><i style={css({ '--n': '4', background: '#3a2266' })}></i></div>
                  </div></div></div>
                  <div className="art"><div className="art__box">
                    <video className="fit" src="/home/street.mp4" poster="/home/street.jpg" autoPlay muted loop playsInline aria-label="A rainy neon street at night, on an edit timeline"></video>
                    <span className="tag">00:12:04</span>
                    <div className="tl" aria-hidden="true">
                      <div className="tl__row"><i style={css({ flex: '3' })}></i><i style={css({ flex: '2' })}></i><i style={css({ flex: '4' })}></i><i style={css({ flex: '2' })}></i></div>
                      <div className="tl__row tl__row--b"><i style={css({ flex: '2', marginLeft: '12%' })}></i><i style={css({ flex: '3', marginLeft: '9%' })}></i><i style={css({ flex: '1' })}></i></div>
                      <div className="tl__row tl__row--c"><i style={css({ flex: '1' })}></i></div>
                    </div>
                  </div></div>
                  <div className="art"><div className="art__box">
                    <video className="fit" src="/home/hype.mp4" poster="/home/hype.jpg" autoPlay muted loop playsInline aria-label="Skateboard footage re-cut into fast shots"></video>
                    <span className="tag">8 cuts · 0:04</span>
                    <span className="cuts" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
                  </div></div>
                  <div className="art"><div className="art__box">
                    <svg className="mg" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animated shapes: a ring drawing itself and bars rising">
                      <circle className="mg-ring" cx="92" cy="100" r="54"/>
                      <circle className="mg-dot" cx="92" cy="46" r="9"/>
                      <rect className="mg-bar" style={css({ '--n': '0' })} x="184" y="92" width="22" height="62" rx="5"/>
                      <rect className="mg-bar" style={css({ '--n': '1' })} x="214" y="62" width="22" height="92" rx="5"/>
                      <rect className="mg-bar" style={css({ '--n': '2' })} x="244" y="110" width="22" height="44" rx="5"/>
                      <rect className="mg-bar" style={css({ '--n': '3' })} x="274" y="46" width="22" height="108" rx="5"/>
                    </svg>
                  </div></div>
                  <div className="art"><div className="art__box"><div className="kt" role="img" aria-label="The words keep, making, stuff, up, one at a time"><b><span>KEEP</span></b><b><span>MAKING</span></b><b><span>STUFF</span></b><b><span>UP!</span></b></div></div></div>
                  <div className="art"><div className="art__box"><canvas id="orb" role="img" aria-label="A rotating sphere of points"></canvas></div></div>
                  <div className="art"><div className="art__box"><div className="gm" role="img" aria-label="A tiny running game">
                    <span className="gm__score">0128</span>
                    <i className="gm__star" style={css({ left: '18%', top: '22%' })}></i><i className="gm__star" style={css({ left: '62%', top: '34%' })}></i><i className="gm__star" style={css({ left: '80%', top: '16%' })}></i><i className="gm__star" style={css({ left: '40%', top: '48%' })}></i>
                    <i className="gm__ground"></i><i className="gm__hero"></i><i className="gm__rock"></i>
                  </div></div></div>
                  <div className="art"><div className="art__box"><div className="th">
                    <div className="th__card th__card--b" style={css({ backgroundImage: 'url(/home/portrait.jpg)' })}><em>B2</em></div>
                    <div className="th__card th__card--a" style={css({ backgroundImage: 'url(/home/portrait.jpg)' })}><em>A1</em><strong>NO EDITOR.<br /><span>ONE PROMPT.</span></strong></div>
                  </div></div></div>
                </div>
                <div className="glow glow--soft says">
                  <p><span className="ag"><img id="reel-ico" src="/home/agents/claude.svg" alt="" /></span><b id="reel-agent">Claude Code</b> <span id="reel-verb">picked</span> <code id="reel-skill">pack-brand-kit</code></p>
                  <div className="says__btns" aria-hidden="true"><span className="mock">Leave a note</span><span className="mock mock--go"><svg className="ic" style={css({ width: '16px', height: '16px' })}><use href="#i-check"/></svg>Approve</span></div>
                  <small>Nothing is final until you approve it.</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02: a light sheet. The one chapter with headshots. */}
      <section className="chapter sheet" id="store">
        <div className="words" data-story="">
          <div className="words__stage">
            <h2 className="big big--stack"><span className="w">Tested.</span><span className="w">Iterated.</span><span className="w">Improved.</span><span className="w w--spec">Every day.</span></h2>
            <div className="wrap words__meta"><span><b>02</b> / 06</span><span>the store</span></div>
          </div>
        </div>
        <div className="wrap after">
          <div className="lines">
            <p>50+ skills, MCPs and apps.</p>
            <p className="k">And growing every day.</p>
          </div>

          <div className="legend">
            <Link className="kind" {...into(EXPLORE.skill)}>
              <div className="kind__art" aria-hidden="true"><div className="rcp"><i style={css({ '--n': '0', '--w': '70%' })}></i><i style={css({ '--n': '1', '--w': '52%' })}></i><i style={css({ '--n': '2', '--w': '82%' })}></i><i style={css({ '--n': '3', '--w': '44%' })}></i></div></div>
              <div className="kind__top"><b>Skills</b><span>{counts.skill}</span></div>
              <p>A recipe your agent follows, step by step. It knows the craft, so you don&apos;t have to explain it.</p>
            </Link>
            <Link className="kind" {...into(EXPLORE.mcp)}>
              <div className="kind__art" aria-hidden="true">
                <svg className="hub" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet">
                  <line x1="150" y1="75" x2="52" y2="32"/><line x1="150" y1="75" x2="248" y2="32"/><line x1="150" y1="75" x2="52" y2="118"/><line x1="150" y1="75" x2="248" y2="118"/>
                  <rect x="12" y="18" width="80" height="28" rx="9"/><text x="52" y="32">Blender</text>
                  <rect x="208" y="18" width="80" height="28" rx="9"/><text x="248" y="32">Figcraft</text>
                  <rect x="12" y="104" width="80" height="28" rx="9"/><text x="52" y="118">ElevenLabs</text>
                  <rect x="208" y="104" width="80" height="28" rx="9"/><text x="248" y="118">ComfyUI</text>
                  <circle cx="150" cy="75" r="26"/><text className="hub__you" x="150" y="75">agent</text>
                </svg>
              </div>
              <div className="kind__top"><b>MCPs</b><span>{counts.mcp}</span></div>
              <p>Tools your agent can pick up and use: a 3D app, a design editor, a voice, an image model.</p>
            </Link>
            <Link className="kind" {...into(EXPLORE.app)}>
              <div className="kind__art" aria-hidden="true"><div className="win"><div className="win__pic"></div><i className="win__pin"></i><div className="win__bar"></div></div></div>
              <div className="kind__top"><b>Apps</b><span>{counts.app}</span></div>
              <p>Screens where you look at what was made, pin a note on the exact spot, and approve.</p>
            </Link>
          </div>

          <div className="shelf">
            <div className="ledger" aria-hidden="true">
              <div className="ledger__top"><b><img src="/brand/mediamake-mark.svg" alt="" width="16" height="16" />Store <svg className="ic" style={css({ width: '15px', height: '15px' })}><use href="#i-chev"/></svg></b></div>
              <div className="ledger__tools"><svg className="ic"><use href="#i-plus"/></svg><svg className="ic"><use href="#i-filter"/></svg><svg className="ic"><use href="#i-search"/></svg></div>
              <div className="trow trow--head"><span>Name</span><span>Kind</span><span>Status</span></div>
              {ledger.map((item, i) => (
                <div className={`trow${i % 3 === 2 ? ' trow--lit' : ''}`} key={item.id}>
                  <b>{item.title}</b>
                  <span>{item.kind}</span>
                  <span className={`pill${item.level === 'Ready' ? ' pill--ready' : ''}`}>{item.level}</span>
                </div>
              ))}
            </div>

            <div className="frame shelf__frame">
              <p className="shelf__meta">On the shelf today <span>{counts.skill} skills · {counts.mcp} MCPs · {counts.app} apps</span></p>
              <ul className={shelf.length > 9 ? 'heads heads--more' : 'heads'}>
                {shelf.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href}>
                      <img src={item.headshot} alt="" loading="lazy" />
                      <b>{item.title}</b>
                      <span>{item.kind} · {item.level}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="shelf__more"><Link className="btn btn--light" {...into(EXPLORE.all)}>Browse the store <svg className="ic"><use href="#i-arrow"/></svg></Link></div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 */}
      <section className="chapter" id="quality">
        <div className="words" data-story="">
          <div className="words__stage">
            <h2 className="big"><span className="w w--spec">Quality</span> <span className="w">over</span> <span className="w">quantity.</span></h2>
            <div className="wrap words__meta"><span><b>03</b> / 06</span><span>why this store</span></div>
          </div>
        </div>
        <div className="wrap split after">
          <div className="lines">
            <p>There are a whole lot of skills out there</p>
            <p>that exist for the name&apos;s sake,</p>
            <p>and don&apos;t quite do what you meant on your own machine.</p>
            <p className="k">We filter out the good ones,</p>
            <p className="k">improve them daily,</p>
            <p className="k">and actually use them ourselves.</p>
          </div>
          <div className="stage">
            <div className="wall" aria-hidden="true">
              <div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div>
              <div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div>
              <div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div>
              <div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div>
              <div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div>
              <div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div><div className="ghost"><i></i><i></i><i></i></div>
            </div>
            <div className="glow proof">
              <h3>What puts an item on the shelf</h3>
              <ul className="checks">
                <li><svg className="ic"><use href="#i-check"/></svg>It runs on a real machine</li>
                <li><svg className="ic"><use href="#i-check"/></svg>We made real work with it</li>
                <li><svg className="ic"><use href="#i-check"/></svg>It gets better from daily use</li>
                <li><svg className="ic"><use href="#i-check"/></svg>You can read how it works</li>
              </ul>
              <p className="proof__rule">We publish nothing we don&apos;t use.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 04: a light sheet */}
      <section className="chapter sheet" id="open">
        <div className="words" data-story="">
          <div className="words__stage">
            <h2 className="big big--m"><span className="w">Completely</span> <span className="w w--spec">free</span> <span className="w">&amp;</span> <span className="w">open</span> <span className="w">source.</span></h2>
            <div className="wrap words__meta"><span><b>04</b> / 06</span><span>open source</span></div>
          </div>
        </div>
        <div className="wrap split after">
          <div className="split__copy">
            <div className="lines">
              <p className="k">What&apos;s the catch?</p>
              <p>Some highly worked skills and utilities sit behind a tier</p>
              <p>you can only reach once you&apos;ve contributed something to MediaMake yourself.</p>
            </div>
            <a className="link" href="https://github.com/microfox-ai/mediamake" target="_blank" rel="noreferrer">See the repo on GitHub <svg className="ic"><use href="#i-arrow"/></svg></a>
          </div>
          <div className="repo">
            <div className="bar" aria-hidden="true"><svg className="ic"><use href="#i-grip"/></svg><b>microfox-ai / mediamake</b> public <span className="bar__plus"><svg className="ic"><use href="#i-plus"/></svg></span></div>
            <div className="frame repo__frame">
              <ul className="tree">
                <li><svg className="ic"><use href="#i-folder"/></svg>.agents/skills/<span>the skills</span></li>
                <li><svg className="ic"><use href="#i-folder"/></svg>apps/studio/<span>where videos are built</span></li>
                <li><svg className="ic"><use href="#i-folder"/></svg>apps/mediamake/<span>the store, the review apps</span></li>
                <li><svg className="ic"><use href="#i-file"/></svg>install.md<span>set up by one prompt</span></li>
                <li><svg className="ic"><use href="#i-file"/></svg>LICENSE</li>
              </ul>
            </div>
            <div className="glow stairs">
              <h3>Membership <span>earned, never bought</span></h3>
              <div className="steps3" role="img" aria-label="Three tiers: Public for everyone, then Plus and Pro, each earned by contributing">
                <i aria-hidden="true"></i>
                <div style={css({ '--h': '42%', '--c1': '#f7931e', '--c2': '#e6332d' })}><b>Public</b><span>everyone</span></div>
                <div style={css({ '--h': '70%', '--c1': '#e91e63', '--c2': '#b0073f' })}><b>Plus</b><span>contribute</span></div>
                <div style={css({ '--h': '100%', '--c1': '#8a2878', '--c2': '#3a2266' })}><b>Pro</b><span>contribute</span></div>
              </div>
              <svg className="cursor" viewBox="0 0 32 32" aria-hidden="true"><path d="M6 3v22l6.2-5.6 4 8.6 4.2-2-4-8.4H25z" fill="#fff" stroke="#000" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>
      </section>

      {/* 05 */}
      <section className="chapter" id="how">
        <div className="bloom" style={css({ right: '-220px', top: '38%', width: '900px', height: '700px' })}></div>
        <div className="words" data-story="">
          <div className="words__stage">
            <h2 className="big"><span className="w">How</span> <span className="w">it</span> <span className="w w--spec">works?</span></h2>
            <div className="wrap words__meta"><span><b>05</b> / 06</span><span>setup</span></div>
          </div>
        </div>
        <div className="wrap after" style={css({ position: 'relative' })}>
          <div className="lines">
            <p>Copy the setup prompt,</p>
            <p>and it sets up the base for you.</p>
            <p className="k">MediaMake is a repo, and in it lies the best-crafted library setup these skills need to run.</p>
          </div>

          <div className="steps">
            <div className="step">
              <div className="bar" aria-hidden="true"><svg className="ic"><use href="#i-grip"/></svg><b>Step 1</b> your agent <span className="bar__plus"><svg className="ic"><use href="#i-plus"/></svg></span></div>
              <div className="frame">
                <h3>Paste it into <span className="ags" role="img" aria-label="Claude Code, Codex or Antigravity"><span className="ag"><img src="/home/agents/claude.svg" alt="" /></span><span className="ag"><img src="/home/agents/codex.svg" alt="" /></span><span className="ag"><img src="/home/agents/antigravity.svg" alt="" /></span></span></h3>
                <p>Your agent reads the setup skill and does the rest on your computer.</p>
                <div className="glow glow--soft code">
                  <div className="code__name"><svg className="ic"><use href="#i-code"/></svg>setup-mediamake</div>
                  <pre id="setup-text">Set up MediaMake on this computer (the repo, its dependencies, workspace, media library and cleanups) by following https://github.com/microfox-ai/mediamake/blob/main/.agents/skills/setup-mediamake/SKILL.md</pre>
                  <button className="btn btn--light btn--sm" type="button" id="copy-setup-step" data-copy="setup" style={css({ alignSelf: 'flex-start' })}><svg className="ic"><use href="#i-copy"/></svg><span data-label="">Copy the setup prompt</span></button>
                </div>
              </div>
            </div>
            <div className="step">
              <div className="bar" aria-hidden="true"><svg className="ic"><use href="#i-grip"/></svg><b>Step 2</b> the repo <span className="bar__plus"><svg className="ic"><use href="#i-plus"/></svg></span></div>
              <div className="frame">
                <h3>It sets up the base</h3>
                <p>Everything the skills lean on, installed and explained once.</p>
                <ul className="inside">
                  <li><svg className="ic"><use href="#i-film"/></svg>Remotion <span>video, in code</span></li>
                  <li><svg className="ic"><use href="#i-blocks"/></svg>Skill architecture <span>how skills fit together</span></li>
                  <li><svg className="ic"><use href="#i-chip"/></svg>Local models <span>BiRefNet, Whisper…</span></li>
                  <li><svg className="ic"><use href="#i-sign"/></svg>When to use what <span>written down</span></li>
                </ul>
              </div>
            </div>
            <div className="step">
              <div className="bar" aria-hidden="true"><svg className="ic"><use href="#i-grip"/></svg><b>Step 3</b> you <span className="bar__plus"><svg className="ic"><use href="#i-plus"/></svg></span></div>
              <div className="frame">
                <h3>Say what you want made</h3>
                <p>Then review. Nothing is final until you say so.</p>
                <div className="mini" aria-hidden="true">
                  <p className="bubble">Make a brand kit for my channel.</p>
                  <p className="stepline"><span>Preview ready</span><span className="t">review</span></p>
                </div>
              </div>
            </div>
          </div>

          <p className="pipe__label">After that, every request runs like this</p>
          <ol className="pipe">
            <li><span className="pipe__ic"><svg className="ic"><use href="#i-chat"/></svg></span><b>You say it</b><span>in plain words</span></li>
            <li style={css({ '--n': '1' })}><span className="pipe__ic pipe__ic--ag" role="img" aria-label="Claude Code, Codex or Antigravity"><span className="ag"><img src="/home/agents/claude.svg" alt="" /></span><span className="ag"><img src="/home/agents/codex.svg" alt="" /></span><span className="ag"><img src="/home/agents/antigravity.svg" alt="" /></span></span><b>Your agent</b><span>takes the request</span></li>
            <li style={css({ '--n': '2' })}><span className="pipe__ic"><svg className="ic"><use href="#i-book"/></svg></span><b>picks a skill</b><span>the recipe for that craft</span></li>
            <li style={css({ '--n': '3' })}><span className="pipe__ic"><svg className="ic"><use href="#i-plug"/></svg></span><b>uses MCPs and local models</b><span>to do the making</span></li>
            <li style={css({ '--n': '4' })}><span className="pipe__ic"><svg className="ic"><use href="#i-window"/></svg></span><b>You review</b><span>it is final when you say so</span></li>
          </ol>
        </div>
      </section>

      {/* 06: the film behind, the words in front */}
      <section className="mani" id="amplified" data-story="">
        <div className="mani__stage">
          <video className="mani__bg" src="/home/dancer.mp4" poster="/home/dancer.jpg" autoPlay muted loop playsInline aria-hidden="true"></video>
          <div className="mani__shade"></div>
          <div className="wrap mani__in">
            <h2 className="big"><span className="w">Creativity</span><span className="w w--spec">Amplified.</span></h2>
            <div className="lines">
              <p className="w">Let no one stop you from building your dreams.</p>
              <p className="w">Pandora&apos;s box has been unlocked,</p>
              <p className="w">and whoever can make the best use of it should.</p>
              <p className="w k">Not giving it your all is a crime your future self won&apos;t pardon.</p>
            </div>
          </div>
          <div className="wrap words__meta"><span><b>06</b> / 06</span><span>why</span></div>
        </div>
      </section>

      <section className="end">
        <div className="wrap end__in">
          <p className="end__type" aria-label="So, keep making stuff up!"><span aria-hidden="true">So, keep making <span className="swap" id="endswap"><em className="spec" id="endword">stuff</em><i className="caret"></i></span> up!</span></p>
          <img className="end__mark" src="/brand/mediamake-mark.svg" alt="MediaMake" />
          <div className="cta" style={css({ marginTop: '0' })}>
            <button className="btn btn--light" type="button" id="copy-setup-end" data-copy="setup"><svg className="ic"><use href="#i-copy"/></svg><span data-label="">Copy the setup prompt</span></button>
            <Link className="btn btn--line" {...into(EXPLORE.home)}>Enter app <svg className="ic"><use href="#i-arrow"/></svg></Link>
          </div>
          <p className="works">Works in <b><span className="ag"><img src="/home/agents/claude.svg" alt="" /></span>Claude Code</b><b><span className="ag"><img src="/home/agents/codex.svg" alt="" /></span>Codex</b><b><span className="ag"><img src="/home/agents/antigravity.svg" alt="" /></span>Antigravity</b></p>
        </div>
      </section>

      </main>

      <footer className="foot">
        <div className="wrap foot__in">
          <span>Built by the Microfox team · Stock footage from Pexels · Claude, Codex and Antigravity are their makers&apos; marks</span>
          <nav aria-label="Footer">
            <a href="https://github.com/microfox-ai/mediamake" target="_blank" rel="noreferrer">MediaMake on GitHub</a>
            <a href="https://github.com/microfox-ai/extensions" target="_blank" rel="noreferrer">Extensions on GitHub</a>
          </nav>
        </div>
      </footer>

      </div>

      <SetupToast copied={toast.copied} shown={toast.shown} onClose={closeToast} />
      <SignInPopup target={signIn} providers={providers} onClose={() => setSignIn(null)} />
    </div>
  );
}
