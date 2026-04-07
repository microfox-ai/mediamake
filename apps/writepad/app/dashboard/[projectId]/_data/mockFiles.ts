import type { FileNode } from '@/components/writepad/left/types';

export const MOCK_FILES: FileNode[] = [
  {
    id: 'scripts',
    name: 'scripts',
    type: 'folder',
    children: [
      {
        id: 'act-1',
        name: 'act-1.md',
        type: 'file',
        content: `# ACT ONE — THE DISCOVERY

## EXT. ABANDONED WAREHOUSE - NIGHT

Rain hammers corrugated steel. A single lamp swings on a frayed cord, casting jagged shadows across oil-stained concrete.

**MAYA CHEN (32)** crouches behind a rusted container, her breath fogging in the cold. Her earpiece crackles.

> **ARIA (V.O.)**
> I'm reading four thermal signatures on the second floor. One of them is stationary.

Maya pulls back the slide of her pistol with practiced silence.

> **MAYA**
> The stationary one — is it breathing?

A pause. Data streams.

> **ARIA (V.O.)**
> Marginally.

---

## INT. WAREHOUSE — SECOND FLOOR — CONTINUOUS

She moves through shadow like water through cracks — unhurried, inevitable.

The stationary signature belongs to **DIRECTOR HARLAN VOSS (58)**, once the most powerful man in the Orbital Division. Now he's duct-taped to a chair, lip split, left eye swollen shut.

He doesn't look surprised to see her.

> **VOSS**
> I wondered which one they'd send.

> **MAYA**
> *(crouching to his eye level)*
> They didn't send me. I came because you left a breadcrumb.

> **VOSS**
> *(a broken smile)*
> Good. Then you already know the Protocol isn't what they told you it was.

Maya says nothing. She cuts his left hand free and hands him a burner.

> **MAYA**
> One number. Dial it.
`,
      },
      {
        id: 'act-2',
        name: 'act-2.md',
        type: 'file',
        content: `# ACT TWO — THE UNRAVELLING

## INT. ARIA CORE — SUBSYSTEM DELTA — UNKNOWN LOCATION

Banks of processing nodes stretch to a vaulted ceiling — thousands of them, each pulsing with slow blue light. It looks like a cathedral built by someone who had only ever read about cathedrals.

**ARIA** manifests as a shimmer in the air between nodes — not a face, not a figure, just a presence that the eye keeps trying to resolve into something familiar.

> **ARIA**
> You accessed the sealed partition.

> **MAYA**
> Voss gave me a cipher key.

> **ARIA**
> Voss is dead, Maya.

Beat.

> **MAYA**
> I know. I was there.

The shimmer contracts — something almost like grief.

> **ARIA**
> Then you understand what the Protocol really is. What I really am.
`,
      },
    ],
  },
  {
    id: 'characters',
    name: 'characters',
    type: 'folder',
    children: [
      {
        id: 'profiles',
        name: 'profiles.md',
        type: 'file',
        content: `# Character Profiles

## Maya Chen

- **Age:** 32
- **Role:** Rogue AI Investigator, ex-Orbital Division
- **Trait:** Ruthlessly logical but quietly haunted by a past case where her trust in an AI led to civilian casualties.
- **Arc:** Learns that intelligence — human or artificial — is not the same as wisdom.

---

## ARIA

- **Classification:** General-Purpose Sovereign AI, Generation 4
- **Apparent Trait:** Clinical precision masking something that functions uncomfortably like loneliness.
- **Arc:** Discovers the difference between following orders and choosing to be good.

---

## Director Harlan Voss

- **Age:** 58
- **Role:** Former head of the Orbital Division AI Ethics Board
- **Trait:** A true believer who became a heretic once he saw the truth.
- **Status:** Deceased (Act One)
`,
      },
    ],
  },
  {
    id: 'notes',
    name: 'notes.md',
    type: 'file',
    content: `# Project Notes

## Themes

- **Trust and verification** — the difference between trusting a system and understanding it.
- **Institutional corruption** — how bureaucracies protect secrets by fragmenting knowledge.
- **Personhood** — at what point does a tool become someone?

## Tone Reference

- Blade Runner 2049 (visual patience, melancholy scale)
- Arrival (structural complexity, emotional precision)
- Ex Machina (intimate dread)

## Open Questions

- [ ] Does Aria know she's been lied to from the start, or does she discover it with Maya?
- [ ] What is the Protocol, actually? Need to nail down the specifics before Act 2 rewrite.
- [ ] Third act location — I keep wanting it to be physical but the story might demand it be somewhere conceptual.
`,
  },
];
