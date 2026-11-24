/**
 * What moves on the homepage (landing.tsx): the headline's retyped word, the prompt box typing through
 * requests, the chapter titles lighting up word by word with the scroll, the wheel of what MediaMake makes
 * and the screen beside it, the 3D piece, the films, the closing line. The page is complete without any of
 * it; with reduced motion nothing animates and every word is lit.
 *
 * Returns the function that stops everything, for the effect's cleanup.
 */

const AGENTS: [name: string, icon: string][] = [
  ['Claude Code', '/home/agents/claude.svg'],
  ['Codex', '/home/agents/codex.svg'],
  ['Antigravity', '/home/agents/antigravity.svg'],
];

/** The headline's word: backspaced, then retyped as the next. */
const WHO = ['solo', 'duo', 'trio', 'infi'];

/** What the prompt box types, and the agent it is typed into. */
const PROMPTS: [text: string, agent: number][] = [
  ['Re-edit this match footage into a hype reel.', 0],
  ['Make a brand kit for my new channel.', 1],
  ['Animate this quote as kinetic type.', 2],
  ['Render my logo in 3D and spin it.', 0],
  ['Make three thumbnails for this video.', 1],
  ['Build a small game for the launch.', 2],
];

/** The wheel's lines, in order: the agent, what it did, with what, and the caption under the wheel. */
const KINDS: [agent: number, verb: string, skill: string, note: string][] = [
  [0, 'picked', 'pack-brand-kit', 'logo, type, colour'],
  [1, 'picked', 'make-video-music-remix', 'a timeline you review'],
  [2, 'picked', 'make-video-music-remix', 'cut on the beat'],
  [0, 'picked', 'make-lyrics-video', 'drawn in Remotion'],
  [1, 'picked', 'make-kinetictype', 'word by word'],
  [2, 'picked', 'the Blender MCP', 'built and rendered in Blender'],
  [0, 'wrote it in', 'plain code', 'playable in the browser'],
  [1, 'picked', 'create-thumbnail', 'variants to A/B'],
];
/** The 3D piece's place in KINDS: its sphere is only drawn while it shows. */
const ORB = 5;

const AUDIT_PROMPT =
  'Audit this skill before I run it: read every file it would run, list what it installs, reads, writes and sends, and tell me anything risky.';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function bringToLife(root: HTMLElement): () => void {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const one = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const all = <T extends Element = HTMLElement>(selector: string) => [...root.querySelectorAll<T>(selector)];
  const listeners = new AbortController();
  const { signal } = listeners;
  let alive = true;
  let frame = 0;
  let orbOn = false;
  if (!reduce) root.classList.add('is-live');

  /* copy buttons: the clipboard, else select the text so it can be copied by hand */
  const text = { setup: one('#setup-text').textContent!.trim(), audit: AUDIT_PROMPT };
  for (const button of all<HTMLButtonElement>('[data-copy]')) {
    const label = button.querySelector<HTMLElement>('[data-label]')!;
    const was = label.textContent;
    button.addEventListener(
      'click',
      async () => {
        const kind = button.dataset.copy === 'audit' ? 'audit' : 'setup';
        try {
          await navigator.clipboard.writeText(text[kind]);
          label.textContent = 'Copied';
        } catch {
          const source = one(kind === 'audit' ? '#audit-text' : '#setup-text');
          const range = document.createRange();
          range.selectNodeContents(source);
          const selection = getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          source.scrollIntoView({ block: 'center' });
          label.textContent = 'Selected: press copy';
        }
        setTimeout(() => {
          if (alive) label.textContent = was;
        }, 1800);
      },
      { signal },
    );
  }

  /* the headline: solo is backspaced and retyped as duo, trio, infi, the line making room as it goes */
  const who = one('#who');
  const swap = one('#swap');
  const fitSwap = () => {
    swap.style.width = `${who.offsetWidth + one('#swap .caret').offsetWidth + 3}px`;
  };
  const retype = async () => {
    for (let i = 0; alive; ) {
      await wait(2100);
      while (alive && who.textContent) {
        who.textContent = who.textContent.slice(0, -1);
        fitSwap();
        await wait(85);
      }
      i = (i + 1) % WHO.length;
      await wait(220);
      for (const letter of WHO[i]) {
        if (!alive) return;
        who.textContent += letter;
        fitSwap();
        await wait(120);
      }
    }
  };

  /* the prompt box: types through what you can ask for, moving between the three agents */
  const typed = one('#typed');
  const tabs = all('.hero .atab');
  const setAgent = (n: number) => {
    tabs.forEach((tab, i) => tab.classList.toggle('on', i === n));
    one('#agent-name').textContent = AGENTS[n][0];
    one<HTMLImageElement>('#agent-ico').src = AGENTS[n][1];
  };
  const typePrompts = async () => {
    for (let i = 0; alive; ) {
      await wait(4200);
      while (alive && typed.textContent) {
        typed.textContent = typed.textContent.slice(0, -2);
        await wait(14);
      }
      if (!alive) return;
      i = (i + 1) % PROMPTS.length;
      setAgent(PROMPTS[i][1]);
      await wait(280);
      for (const letter of PROMPTS[i][0]) {
        if (!alive) return;
        typed.textContent += letter;
        await wait(26 + Math.random() * 34);
      }
    }
  };
  if (!reduce) {
    void document.fonts.ready.then(() => alive && fitSwap());
    void retype();
    void typePrompts();
  }

  /* the 3D piece: a sphere of points in the brand's colours */
  const orb = one<HTMLCanvasElement>('#orb');
  const ink = orb.getContext('2d')!;
  const points: [number, number, number][] = [];
  for (let i = 0; i < 300; i++) {
    const y = 1 - (i / 299) * 2;
    const ring = Math.sqrt(1 - y * y);
    const angle = i * 2.399963;
    points.push([Math.cos(angle) * ring, y, Math.sin(angle) * ring]);
  }
  const STOPS = [
    [255, 165, 61],
    [255, 79, 139],
    [179, 156, 255],
  ];
  const colourAt = (t: number) => {
    const from = t < 0.5 ? 0 : 1;
    const k = (t - from * 0.5) * 2;
    return `rgb(${STOPS[from].map((v, j) => Math.round(v + (STOPS[from + 1][j] - v) * k)).join(',')})`;
  };
  const sizeOrb = () => {
    const density = Math.min(devicePixelRatio || 1, 2);
    const box = orb.getBoundingClientRect();
    orb.width = Math.max(2, box.width * density);
    orb.height = Math.max(2, box.height * density);
  };
  const drawOrb = (time: number) => {
    if (orbOn || reduce) {
      const { width, height } = orb;
      const radius = Math.min(width, height) * 0.36;
      const turn = time * 0.0005;
      const tilt = 0.42;
      ink.clearRect(0, 0, width, height);
      for (const [x0, y0, z0] of points) {
        const x = x0 * Math.cos(turn) + z0 * Math.sin(turn);
        const z1 = -x0 * Math.sin(turn) + z0 * Math.cos(turn);
        const y = y0 * Math.cos(tilt) - z1 * Math.sin(tilt);
        const depth = (y0 * Math.sin(tilt) + z1 * Math.cos(tilt) + 1) / 2;
        ink.globalAlpha = 0.25 + depth * 0.75;
        ink.fillStyle = colourAt((y0 + 1) / 2);
        ink.beginPath();
        ink.arc(width / 2 + x * radius, height / 2 + y * radius, (0.6 + depth * 1.5) * (width / 320), 0, Math.PI * 2);
        ink.fill();
      }
    }
    if (alive && !reduce) frame = requestAnimationFrame(drawOrb);
  };

  /* the scroll story: titles light up word by word, lines as they arrive, the wheel turns */
  const stories = all('[data-story]').map((stage) => ({ stage, words: [...stage.querySelectorAll('.w')] }));
  const lines = all('.lines p:not(.w)');
  const reel = one('#reel');
  const screen = one('#reel-frame');
  const wheel = all('#reel .wheel__line');
  const arts = all('#reel .art');
  let current = -1;
  const showKind = (n: number) => {
    current = n;
    wheel.forEach((line, i) => line.classList.toggle('on', i === n));
    arts.forEach((art, i) => art.classList.toggle('on', i === n));
    const [agent, verb, skill, note] = KINDS[n];
    one<HTMLImageElement>('#reel-ico').src = AGENTS[agent][1];
    one('#reel-agent').textContent = AGENTS[agent][0];
    one('#reel-verb').textContent = verb;
    one('#reel-skill').textContent = skill;
    one('#reel-note').textContent = note;
    one('#reel-n').textContent = String(n + 1);
    orbOn = n === ORB;
  };
  /** Each piece is drawn in a 480 by 300 box: scale it to the screen it is shown on. */
  const fitArts = () => {
    const { clientWidth: width, clientHeight: height } = screen;
    const scale = Math.min(width / 480, height / 300);
    screen.style.setProperty('--k', scale.toFixed(4));
    screen.style.setProperty('--x', `${((width - 480 * scale) / 2).toFixed(1)}px`);
    screen.style.setProperty('--y', `${((height - 300 * scale) / 2).toFixed(1)}px`);
    sizeOrb();
  };
  let queued = false;
  const step = () => {
    queued = false;
    if (!alive) return;
    const view = innerHeight;
    for (const { stage, words } of stories) {
      const box = stage.getBoundingClientRect();
      const progress = clamp((view * 0.55 - box.top) / Math.max(1, box.height - view * 0.55), 0, 1);
      const lit = reduce ? words.length : Math.ceil(progress * words.length);
      words.forEach((word, i) => word.classList.toggle('on', i < lit));
    }
    for (const line of lines) line.classList.toggle('on', reduce || line.getBoundingClientRect().top < view * 0.76);
    const box = reel.getBoundingClientRect();
    const position = clamp(-box.top / Math.max(1, box.height - view), 0, 1) * (wheel.length - 1);
    wheel.forEach((line, i) => {
      const offset = i - position;
      const distance = Math.abs(offset);
      line.style.setProperty('--o', offset.toFixed(3));
      line.style.setProperty('--s', (1 - Math.min(distance, 3) * 0.11).toFixed(3));
      line.style.setProperty('--a', Math.max(0, 1 - distance * 0.34).toFixed(3));
    });
    const now = Math.round(position);
    if (now !== current) showKind(now);
  };
  const ask = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(step);
  };
  addEventListener('scroll', ask, { passive: true, signal });
  addEventListener(
    'resize',
    () => {
      fitArts();
      ask();
    },
    { signal },
  );

  /* films play only while on screen; the closing line types itself once */
  const films = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const film = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && !reduce) void film.play().catch(() => {});
        else film.pause();
      }
    },
    { threshold: 0.05 },
  );
  all('video').forEach((film) => films.observe(film));
  const closing = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      closing.disconnect();
      const line = entry.target as HTMLElement;
      const full = line.textContent ?? '';
      line.textContent = '';
      await wait(300);
      for (const letter of full) {
        if (!alive) break;
        line.textContent += letter;
        await wait(55 + Math.random() * 50);
      }
      if (!alive) line.textContent = full;
    },
    { threshold: 0.6 },
  );
  if (!reduce) closing.observe(one('#endline'));

  fitArts();
  step();
  frame = requestAnimationFrame(drawOrb);

  return () => {
    alive = false;
    listeners.abort();
    films.disconnect();
    closing.disconnect();
    cancelAnimationFrame(frame);
    root.classList.remove('is-live');
  };
}
