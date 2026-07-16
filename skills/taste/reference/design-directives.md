# DESIGN DIRECTIVES — detail (§4)

Load when choosing type or colour, or when a §4 rule needs its pool/alternatives. The RULES live
inline in SKILL.md §4 — this file holds only the lists that would bloat it. Same split as
`ai-tells.md` (§9).

---

## §4.1 Typography — pools

**Pairings to know:** `Geist` + `Geist Mono` · `Satoshi` + `JetBrains Mono` · `Cabinet Grotesk` +
`Inter Tight` · `GT America` + `IBM Plex Mono`.

**Sans display pool** (the default for creative agency, design studio, modern brand, premium
consumer, portfolio, lifestyle — everything not genuinely editorial/heritage): Geist Display · ABC
Diatype · Söhne Breit · Cabinet Grotesk Display · Migra Sans · GT Walsheim · Inter Display · PP Neue
Montreal.
Sans display fonts are not "boring" — they are the default for the same reason black is the default
in fashion.

**Serif rotation pool** — only when a serif is justified (rare, see §4.1 SERIF DISCIPLINE). Do NOT
reuse the same serif across consecutive projects: PP Editorial New · GT Sectra Display · Cardinal
Grotesque · Reckless Neue · Tiempos Headline · Recoleta · Cormorant Garamond · Playfair Display ·
EB Garamond · IvyPresto · Migra · Editorial Old · Saol Display · Söhne Breit Kursiv · Domaine
Display · Canela · Schnyder · Tobias · NB Architekt · ITC Galliard.
`Fraunces` and `Instrument_Serif` are BANNED as defaults (the two LLM-favourite display serifs) —
`preflight.mjs` greps for both.

---

## §4.2 Colour — the premium-consumer palette ban, in full

The LLM default for premium-consumer briefs (cookware, wellness, artisan, luxury, heritage craft,
DTC home goods) is warm beige/cream + brass/clay/oxblood/ochre + espresso/ink text. Every
premium-consumer site the model has ever shipped uses it. The brand becomes invisible.

Banned hex families as default backgrounds/accents (`preflight.mjs` greps for each):
- **Backgrounds** (warm paper / cream / chalk / bone): `#f5f1ea` `#f7f5f1` `#fbf8f1` `#efeae0`
  `#ece6db` `#faf7f1` `#e8dfcb`
- **Accents** (brass / clay / oxblood / ochre): `#b08947` `#b6553a` `#9a2436` `#9c6e2a` `#bc7c3a`
  `#7d5621`
- **Text** (espresso / warm near-black): `#1a1714` `#1a1814` `#1b1814`

**Default alternatives — rotate, do not reuse:**
- **Cold Luxury:** silver-grey + chrome + smoke (Tesla, Apple Watch Hermès-without-the-leather)
- **Forest:** deep green + bone + amber accent (Filson, Patagonia premium)
- **Black and Tan:** true off-black + warm tan, sharp contrast, no beige
- **Cobalt + Cream:** saturated blue against a single neutral, no brass
- **Terracotta + Slate:** warm rust against cool grey, no brass
- **Olive + Brick + Paper:** muted olive plus brick-red accent
- **Pure monochrome + single saturated pop:** off-white + off-black + one bright accent (electric
  blue, emerald, hot pink)

**Rotation rule:** previous premium-consumer project used beige+brass? This one MUST use a different
family. Never ship the same warm-craft palette twice in a row.

**Override:** beige+brass+espresso is acceptable ONLY when the brand brief explicitly names those
colours, or the brand identity is genuinely vintage/artisan/warm-craft AND you can articulate why
this specific palette fits this specific brand. Default-reaching for it because "this is a cookware
brief" is banned.

---

## §4.9 Spec sheets — alternatives to the banned hairline table

A long product spec table with `border-b` on every row is the AI default for cookware / hardware /
apparel / artisan-goods briefs. Banned. Use one of:
- **2-col card grid:** each spec = its own card — spec name, value as a large display number, one-line
  "why it matters" body. 2-col desktop, 1-col mobile.
- **Scroll-snap horizontal pills:** each spec a pill, user flicks through.
- **Grouped chunks:** 10 specs → 3 logical clusters ("Materials", "Cooking", "Warranty"), each with
  ONE soft divider and a cluster heading.
- **Featured-vs-rest:** 3-4 hero specs as large display tiles, the rest behind a "View full
  specifications" disclosure.

## §4.9 Copy self-audit — what a flagged string looks like

Rewrite any visible string that is:
- **Grammatically broken:** "free on its past" · "two plans but one is honest" · "to put it on the
  table" (out of context).
- **Unclear referent:** "we plan to stay that way" with no prior context.
- **AI hallucination:** cute-but-wrong wordplay, forced metaphors that don't track, "elegant nothing"
  phrases.
- **LLM-trying-to-sound-thoughtful:** passive-aggressive humility, fake-craftsman labels, mock-poetic
  micro-meta.

Unsure whether a string makes sense? Replace it with a plain functional sentence. AI-generated cute
copy is worse than boring copy.
