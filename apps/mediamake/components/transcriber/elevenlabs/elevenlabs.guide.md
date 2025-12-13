This guide is designed for scriptwriters and developers who want to master the specific controls available in ElevenLabs, particularly for the **Eleven v3 (alpha)** and **Turbo v2.5** models.

When writing scripts for ElevenLabs, think of yourself less as a writer and more as a **Director**. The AI does not just read words; it acts them out based on the instructions (tags) you provide.

---

### **1. Audio Tags (The "Director's" Instructions)**

Audio tags are text instructions placed inside square brackets `[ ]` that tell the AI _how_ to perform a line or what sound to make.

#### **Core Syntax**

- **Format:** `[tag]` followed immediately by the text.
- **Placement:** Usually at the start of a sentence or phrase.
- **Compatibility:** Works best with **Eleven v3**.

#### **Tag Categories**

| Category          | Tag Examples                                                                                | Usage Tip                                                                       |
| :---------------- | :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------ |
| **Emotion**       | `[sad]`, `[excited]`, `[angry]`, `[sarcastic]`, `[curious]`, `[confused]`, `[hyped]`        | Use these to set the "mood" before the line is spoken.                          |
| **Vocal Action**  | `[whispers]`, `[shouts]`, `[screams]`, `[mumbles]`, `[sings]`, `[raps]`                     | Defines the _volume_ and _projection_ of the voice.                             |
| **Non-Verbal**    | `[laughs]`, `[giggles]`, `[sighs]`, `[clears throat]`, `[breathing]`, `[sniffs]`, `[yawns]` | Adds realism. Can be used standalone or attached to speech.                     |
| **Sound Effects** | `[applause]`, `[gunshot]`, `[door slam]`, `[footsteps]`                                     | _Experimental_. Best used sparingly as they can sometimes bleed into the voice. |

#### **Advanced: Tag Combinations**

You can stack tags to create complex, nuanced performances. The order matters less than the combination itself, but generally, put the _action_ before the _emotion_ if unsure.

- **The "Secretive Gossip":**
  > `[whispers][excited] You won't believe who I saw at the party last night.`
- **The "Reluctant Admission":**
  > `[sighs][sad] I guess you were right all along...`
- **The "Maniacal Villain":**
  > `[laughs][shouts] You think you can stop me?!`
- **The "Nervous Laughter":**
  > `[nervous][giggles] I... I didn't mean to break it.`

**⚠️ Critical Rule:** _Match the tag to the Voice._

- A "News Anchor" voice will struggle to `[scream]`.
- A "Soft/ASMR" voice will struggle to `[shout]`.
- **Pro Tip:** If a tag isn't working, try a synonymous word (e.g., swap `[sad]` for `[depressed]` or `[crying]`).

---

### **2. Pacing & Rhythm (Controlling Time)**

ElevenLabs tends to read naturally, but for dramatic effect, you often need to force it to slow down or stop.

#### **A. The Break Tag (The "Hard" Pause)**

Use this SSML tag when you need a specific, measured silence.

- **Syntax:** `<break time="1.5s" />`
- **Limit:** Maximum **3 seconds** per break.
- **Warning:** Using too many in a row can cause stability issues (artifacts/noise).
- **Example:**
  > `"And the winner is... <break time="2.0s" /> John Doe!"`

#### **B. The "Soft" Pause (Punctuation Hacks)**

Punctuation influences the rhythm more naturally than break tags.

- **Ellipses (`...`):** Adds a hesitate or trailing pause.
  > `"I... I don't know."`
- **Dashes (`—` or `-`):** Creates a sharp, abrupt cut-off or interruption.
  > `"Wait—what was that?"`
- **Period vs. Comma:** A period is a full stop (breath). A comma is a short beat.

#### **C. Narrative Pacing**

The AI looks at the _context_ to determine speed.

- **To Slow Down:** Write descriptive, somber text. Use longer sentences.
  > `"Slowly, he turned the handle, holding his breath, terrified of what he might find."`
- **To Speed Up:** Use short, punchy sentences. Remove commas.
  > `"Run! Go now! Don't look back!"`

---

### **3. Pronunciation & Clarity (The "Script Supervisor")**

Sometimes the AI mispronounces names or specifically formatted text.

#### **A. Phonetic Respellings (The "Easy Fix")**

If the AI says "Wind" (air) instead of "Wind" (clock), misspell it intentionally.

- **Target Word:** "Siobhan"
- **Script Spelling:** "Shiv-awn"
- **Target Word:** "Resume" (verb)
- **Script Spelling:** "Re-zoom"

#### **B. Text Normalization (Numbers & Symbols)**

The AI (especially Flash v2.5) interprets numbers literally.

- **Dates:** Write "January first 2024" instead of "01/01/2024".
- **Phone Numbers:** Write "5 5 5, 1 2 3, 4 5 6 7" to ensure distinct pacing.
- **Acronyms:** Write "N.A.S.A." or "Nassa" depending on how you want it read.

#### **C. SSML Phonemes (The "Pro" Fix)**

For absolute precision, use the specific phoneme syntax (compatible with specific models like Turbo v2).

> `<phoneme alphabet="cmu-arpabet" ph="M AE1 D IH0 S AH0 N">Madison</phoneme>`
> _(Note: This is complex and usually requires a dictionary tool; phonetic respelling is often faster/easier)._

---

### **4. Best Practices for Script Construction**

1.  **Prompt Length Matters (Eleven v3):**
    - **Do Not:** Generate 1 sentence at a time (e.g., "Hello."). The AI lacks context and might sound random.
    - **Do:** Provide a "chunk" of text (250+ characters). Even if you only need one sentence, include the surrounding text for context and crop the audio later.

2.  **Context Wrappers:**
    If you need a specific emotion but the line is too short, wrap it in a "director's note" narrative.
    - _Goal Audio:_ "Get out!" (Angry)
    - _Script:_ `"He slammed his fist on the table, his face turning red with rage as he screamed at the top of his lungs: 'Get out!'"`
    - _Result:_ The AI reads the quote with the anger established in the narrative.

3.  **Stability Slider:**
    - **Low Stability (30-50%):** More expressive, more emotional variation, better at `[tags]`. Risk of "going off script."
    - **High Stability (70-100%):** Monotone, consistent, ignores extreme emotional tags.

---

### **5. Master Example: The "Before & After"**

#### **❌ The Bad Script**

> Hello. I am scared. Is anyone there? ... I heard a noise.
> _Critique: Too short, no emotional direction, standard punctuation implies a robotic reading._

#### **✅ The Optimized Script (Ready for Generation)**

> `[frightened][whispers]` Hello? Is... is anyone there? `<break time="1.0s" />`
> `[gasp]` I swear I heard a noise just now. `[breathing heavily]`
> `[terrified]` Please, if you can hear me... `[crying]` just let me go.

**Why this works:**

1.  **Tag Stacking:** `[frightened][whispers]` immediately sets a complex mood.
2.  **Pacing:** The `<break>` creates genuine tension.
3.  **Performance:** `[gasp]` and `[breathing heavily]` add non-verbal sounds that sell the realism.
4.  **Emotional Arc:** Starts frightened, moves to terrified/crying.
