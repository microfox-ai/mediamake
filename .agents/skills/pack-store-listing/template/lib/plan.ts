/*
 * The cut of Portal's store videos, shared by the App Store preview (this project, 886x1920) and the
 * Google Play promo (projects/portal-store-promo, 1920x1080).
 *
 * The footage is four takes recorded from the app itself (input/takes, 886x1920, 30 fps): the app's
 * web build on a phone-sized screen, signed in to a sample company with made-up people. Each take's
 * .json lists when it tapped what. The status bar and home indicator are not in the takes: Phone.tsx
 * draws them, so a push slides the screen under a still status bar as on iOS.
 */

export const FPS = 30;

/** Where the takes are, from the projects folder (staticFile's root). */
export const TAKES_DIR = 'portal-store-preview/input/takes';

export type Take = 'home' | 'task' | 'projects' | 'chat';
export type Enter = 'cut' | 'push' | 'sheetUp' | 'sheetDown' | 'fade';

export type Clip = {
  take: Take;
  /** Seconds in the take. */
  from: number;
  to: number;
  /** Faster than real time for scrolls and typing (the store allows 30 s). */
  speed?: number;
  /** How this clip comes in over the last frame of the one before. */
  enter?: Enter;
  /** The headline shown from this clip on (an index into CAPTIONS). */
  caption?: number;
};

/** The screenshots' headlines, in the same words. */
export const CAPTIONS = [
  { title: 'Your whole workday, in one app', sub: 'Tasks, meetings and your team, wherever you are.' },
  { title: 'See what needs you first', sub: 'Waiting and blocked work comes to the top.' },
  { title: 'Update a task in one tap', sub: 'Set its status, then log what you did.' },
  { title: 'Every project at a glance', sub: 'Progress, goals and who’s moving what.' },
  { title: 'Each project, like a channel', sub: 'Its brand, team, goals and worklogs on one page.' },
  { title: 'Chat with your team', sub: 'Replies, reactions and project chats.' },
];

/** Event times in the takes (from input/takes/*.json), so the cuts follow the taps. */
const T = {
  homeTab: 5.15,
  taskPush: 1.05,
  taskDone: 2.58,
  taskSheet: 3.85,
  taskClose: 8.15,
  listPush: 0.91,
  projectPush: 5.21,
  chatPush: 0.91,
  chatSend: 7.86,
  chatReply: 13.07,
};
/** A screen has settled this long after its tap. */
const SETTLE = 0.32;

export const CLIPS: Clip[] = [
  // Home, a look down the day and back.
  { take: 'home', from: 0.55, to: 4.95, speed: 1.45, caption: 0 },
  // The Work tab (tabs switch at once, as on iOS).
  { take: 'home', from: T.homeTab + 0.12, to: 6.8, caption: 1 },
  // The same Work tab in the task take, untouched: the cut doesn't show.
  { take: 'task', from: 0.1, to: T.taskPush },
  // A task: Done in one tap…
  { take: 'task', from: T.taskPush + SETTLE + 0.05, to: T.taskSheet, enter: 'push', caption: 2 },
  // …then Log work, typed in.
  { take: 'task', from: T.taskSheet + SETTLE, to: T.taskClose, speed: 1.55, enter: 'sheetUp' },
  // Back on the task: the history has the new line.
  { take: 'task', from: T.taskClose + SETTLE, to: 9.6, enter: 'sheetDown' },
  // Projects, with their rings and goals.
  { take: 'projects', from: T.listPush + SETTLE + 0.1, to: T.projectPush, speed: 1.45, enter: 'fade', caption: 3 },
  // One project's page, like a channel.
  { take: 'projects', from: T.projectPush + SETTLE + 0.15, to: 9.3, speed: 1.2, enter: 'push', caption: 4 },
  // The project chat: a reaction and a message…
  { take: 'chat', from: T.chatPush + SETTLE + 0.1, to: T.chatSend + 0.75, speed: 1.4, enter: 'fade', caption: 5 },
  // …and a teammate's reply (the wait for it is cut; the screen is still meanwhile).
  { take: 'chat', from: T.chatReply - 0.2, to: 14.3 },
];

export const TRANSITION: Record<Enter, number> = { cut: 0, push: 0.42, sheetUp: 0.45, sheetDown: 0.38, fade: 0.3 };

/** Seconds the end card holds after the last clip. */
export const END_CARD = 2.4;
/** The end card fades in over the last clip's final stretch. */
export const END_FADE = 0.45;

/** The same cut at another pace: the Play promo plays closer to real time (Google suggests 30 s or more). */
export const atPace = (pace: number, clips: Clip[] = CLIPS): Clip[] =>
  clips.map((c) => (c.speed ? { ...c, speed: Math.max(1, 1 + (c.speed - 1) * pace) } : c));

export type Placed = Clip & { start: number; frames: number; index: number };

/** Each clip's place on the timeline, in frames. */
export const timeline = (clips: Clip[] = CLIPS): Placed[] => {
  let start = 0;
  return clips.map((c, index) => {
    const frames = Math.round(((c.to - c.from) / (c.speed ?? 1)) * FPS);
    const placed = { ...c, start, frames, index };
    start += frames;
    return placed;
  });
};

export const clipsFrames = (clips: Clip[] = CLIPS) => timeline(clips).reduce((n, c) => n + c.frames, 0);
export const totalSeconds = (clips: Clip[] = CLIPS) => clipsFrames(clips) / FPS + END_CARD;

/** The caption showing at a frame, and since when. */
export const captionAt = (frame: number, placed: Placed[]) => {
  let index = 0;
  let since = 0;
  for (const c of placed) {
    if (c.start > frame) break;
    if (c.caption !== undefined && c.caption !== index) { index = c.caption; since = c.start; }
    else if (c.caption !== undefined && c.start === 0) since = 0;
  }
  return { index, since };
};
