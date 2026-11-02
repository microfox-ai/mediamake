import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import type { SceneProps } from '../../../../src/kit';
import { at, Caret, Ground, Keycap, prog, Sfx, typed, Window, Word } from '../parts';
import { ASK_PROMPT, C, easeIn, easeInOut, f, INSTALL_PROMPT, INSTALL_STEPS, mono, sans, src } from '../theme';
import { T } from '../timeline';

const R = T.ritual;
const L = (s: number) => at(s, R.from);
const COPY = L(R.copy);
const PASTE = L(R.paste);
const NAME = L(R.name);
const TYPE = L(R.type);
const ENTER = L(R.enter);
const END = f(R.to - R.from);
const CARD = { x: 200, y: 290, w: 780, h: 440 };
const BTN = { x: CARD.x + 52, y: CARD.y + CARD.h - 52 - 80, w: 440, h: 80 };

/** 26.6–38.4 s: "Copy." "Paste." "Name it." — the real install prompt into Claude, then the ask. */
export const Ritual: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  // the card arrives from the Skills scene already in place
  const cardIn = 1;
  const cardOut = prog(frame, PASTE - 24, PASTE - 10, easeIn);
  const copied = frame >= COPY + 5;
  const pressed = frame >= COPY + 4 && frame < COPY + 9;
  // the copied prompt peels off the button as a paper strip and flies out, then drops into both windows
  const peel = prog(frame, COPY + 9, COPY + 30, easeInOut);
  const drop = prog(frame, PASTE - 4, PASTE + 6, easeIn);
  const winIn = prog(frame, PASTE - 14, PASTE);
  const merge = prog(frame, NAME - 10, NAME + 8, easeInOut);
  const exit = prog(frame, END - 12, END, easeIn);
  const bx = BTN.x + BTN.w / 2;
  const by = BTN.y + BTN.h / 2;

  const Prompt: React.FC<{ show: boolean }> = ({ show }) =>
    show ? (
      <div style={{ display: 'flex' }}>
        <span style={{ color: C.clay, width: 30, flexShrink: 0 }}>{'>'}</span>
        <span style={{ background: `rgba(217,119,87,${0.45 * (1 - prog(frame, PASTE + 9, PASTE + 26))})`, fontSize: 22 }}>{INSTALL_PROMPT}</span>
      </div>
    ) : null;
  const Steps: React.FC = () => (
    <div style={{ marginTop: 18 }}>
      {INSTALL_STEPS.map((s, i) => {
        const a = PASTE + 12 + i * 10;
        return frame >= a ? (
          <div key={s} style={{ fontSize: 24, opacity: prog(frame, a, a + 4), color: i === 2 ? C.ivoryLight : '#cfccc3', fontWeight: i === 2 ? 700 : 400 }}>
            <span style={{ color: C.clay }}>✓</span> {s}
          </div>
        ) : null;
      })}
    </div>
  );

  // windows: terminal (left) and the Claude desktop app (right); on "Name it." the app takes the stage
  const term = { x: interpolate(merge, [0, 1], [110, -900]), y: 300, w: 830, h: 470 };
  const app = { x: interpolate(merge, [0, 1], [980, 300]), y: interpolate(merge, [0, 1], [300, 250]), w: interpolate(merge, [0, 1], [830, 1320]), h: interpolate(merge, [0, 1], [470, 560]) };
  const asked = typed(ASK_PROMPT, frame, TYPE, 18);
  const sent = frame >= ENTER;

  return (
    <AbsoluteFill style={{ transform: `translateX(${-exit * 600}px)`, filter: exit ? `blur(${exit * 16}px)` : undefined, opacity: 1 - exit * 0.5 }}>
      <Ground kind="ivory" />

      {/* the MediaMake skill card */}
      {frame < PASTE && (
        <div style={{ position: 'absolute', inset: 0, opacity: cardIn * (1 - cardOut), transform: `translateY(${(1 - cardIn) * 60 - cardOut * 40}px)` }}>
          <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, background: C.ivoryLight, borderRadius: 26, padding: '40px 52px', boxSizing: 'border-box', boxShadow: '0 40px 90px rgba(20,20,19,0.18)', border: '1.5px solid #e2ddd2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontWeight: 700, fontSize: 22, color: C.cloud }}>
              <Img src={src('kit/mediamake-mark.svg')} style={{ width: 34, height: 34 }} />
              mediamake / skills
            </div>
            <div style={{ marginTop: 20, fontFamily: sans, fontWeight: 800, fontSize: 62, letterSpacing: '-0.035em', color: C.slate }}>pack-brand-kit</div>
            <div style={{ marginTop: 8, fontFamily: sans, fontWeight: 800, fontSize: 24, lineHeight: 1.4, color: C.cloud, width: 640 }}>
              a logo, its motion, intros, end screens, a guide and a YouTube kit
            </div>
          </div>
          <div style={{ position: 'absolute', left: BTN.x, top: BTN.y, width: BTN.w, height: BTN.h, borderRadius: 40, background: copied ? C.clay : C.slate, color: C.ivoryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 800, fontSize: 28, transform: `scale(${pressed ? 0.95 : 1})` }}>
            {copied ? '✓ Copied' : 'Copy install prompt'}
          </div>
        </div>
      )}

      {/* the paper strip */}
      {peel > 0 && frame < PASTE + 6 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', perspective: 1400 }}>
          <div
            style={{
              position: 'absolute',
              left: interpolate(peel, [0, 1], [bx, 960]),
              top: interpolate(peel, [0, 1], [by, 230]) + Math.sin(frame / 9) * 6 * peel + drop * 200,
              transform: `translate(-50%, -50%) rotateX(${interpolate(peel, [0, 1], [35, 10]) + drop * 30}deg) rotateZ(${Math.sin(frame / 13) * 2 * peel}deg) scale(${interpolate(peel, [0, 1], [0.8, 1.25]) - drop * 0.55})`,
              background: C.ivoryLight,
              borderRadius: 10,
              padding: '16px 24px',
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 20,
              color: C.slate,
              whiteSpace: 'nowrap',
              boxShadow: '0 24px 50px rgba(20,20,19,0.28)',
              opacity: 1 - drop,
            }}
          >
            {INSTALL_PROMPT.slice(0, 58)}…
          </div>
        </div>
      )}

      {/* Claude Code in a terminal + the Claude desktop app */}
      {frame >= PASTE - 14 && (
        <>
          <Window x={term.x} y={term.y} w={term.w} h={term.h} title="claude · terminal" style={{ opacity: winIn * (1 - merge), transform: `translateY(${(1 - winIn) * 50}px)` }}>
            <Prompt show={frame >= PASTE + 8} />
            <Steps />
          </Window>
          <Window x={app.x} y={app.y} w={app.w} h={app.h} title="Claude · desktop app" desktop style={{ opacity: winIn, transform: `translateY(${(1 - winIn) * 50}px)` }}>
            {frame < NAME ? (
              <>
                <Prompt show={frame >= PASTE + 8} />
                <Steps />
              </>
            ) : (
              <div style={{ position: 'relative', height: 440 }}>
                <div style={{ opacity: 0.35 }}>
                  <Steps />
                </div>
                {sent && (
                  <div style={{ position: 'absolute', right: 0, top: interpolate(prog(frame, ENTER, ENTER + 10), [0, 1], [330, 210]), background: '#33332F', borderRadius: 18, padding: '14px 22px', fontSize: 26, color: C.ivoryLight }}>
                    {ASK_PROMPT}
                  </div>
                )}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, borderRadius: 20, background: '#30302C', border: '1.5px solid #4a4a45', display: 'flex', alignItems: 'center', padding: '0 26px', fontSize: 28 }}>
                  <span style={{ flex: 1, color: sent ? '#77756e' : C.ivoryLight }}>
                    {sent ? 'Reply…' : asked}
                    {!sent && <Caret height={32} color={C.clay} blinkFrom={TYPE + f(3.2)} />}
                  </span>
                  <span style={{ width: 52, height: 52, borderRadius: 26, background: C.clay, color: C.ivoryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, transform: `scale(${frame >= ENTER && frame < ENTER + 5 ? 0.86 : 1})` }}>↑</span>
                </div>
              </div>
            )}
          </Window>
        </>
      )}

      {/* the three spoken words, as keys */}
      <Keycap keys="⌘ C" label="copy." x={1440} y={500} start={COPY} out={PASTE - 18} />
      <Keycap keys="⌘ V" label="paste." x={960} y={150} start={PASTE} out={NAME - 12} />
      <Word word="name it." start={NAME} x={300} y={840} size={96} out={END - 14} />

      <Sfx name="end-paper-loop" at={0} volume={0.22} dur={END} />
      <Sfx name="intro-key" at={COPY - 2} volume={0.7} />
      <Sfx name="intro-key" at={COPY + 3} volume={0.7} />
      <Sfx name="intro-pop" at={COPY + 5} volume={0.45} />
      <Sfx name="intro-fold" at={COPY + 8} volume={0.5} />
      <Sfx name="cwc-whoosh-a" at={COPY + 14} volume={0.4} />
      <Sfx name="intro-key" at={PASTE - 2} volume={0.7} />
      <Sfx name="intro-key" at={PASTE + 3} volume={0.7} />
      <Sfx name="intro-fold" at={PASTE + 2} volume={0.45} />
      {INSTALL_STEPS.map((_, i) => (
        <Sfx key={i} name="intro-3-flick" at={PASTE + 12 + i * 10} volume={0.35} />
      ))}
      {Array.from({ length: Math.ceil(ASK_PROMPT.length / 2) }, (_, i) => (
        <Sfx key={`k${i}`} name="intro-key" at={TYPE + Math.round((i * 2 * 30) / 18)} volume={0.22} />
      ))}
      <Sfx name="intro-send" at={ENTER} volume={0.55} />
      <Sfx name="cwc-whoosh-b" at={END - 12} volume={0.35} />
    </AbsoluteFill>
  );
};
