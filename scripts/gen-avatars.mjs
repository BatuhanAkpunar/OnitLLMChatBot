// Generates the 6 pixel-art role portraits (plus 2 animation frames each)
// via the Gemini API and writes full-size sources to assets/avatars/.
// Then run scripts/optimize-avatars.sh to emit the 512px WebP files the app serves.
//
//   node --env-file=.env.local scripts/gen-avatars.mjs            # all roles
//   node --env-file=.env.local scripts/gen-avatars.mjs qa analyst # only these
//   node --env-file=.env.local scripts/gen-avatars.mjs --alt qa   # only _alt, from base on disk
//
// Files per role: <key>.png (base), <key>_blink.png, <key>_alt.png (gesture).
// Requires GEMINI_API_KEY in .env.local (gitignored, never committed).

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("GEMINI_API_KEY missing in .env.local");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash-image";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

// Street Fighter 2 pixel CRAFT, but warm modern people, with one rigid
// rectangular full-bleed framing spec so all six portraits crop identically.
const STYLE =
  "Pixel art portrait in the visual craft of a Street Fighter 2 arcade character select screen: " +
  "bold 16-bit pixel art, confident dark pixel outlines, chunky cel shading with subtle dithering, " +
  "warm saturated colors, limited 16 color palette, crisp hard pixels, no anti-aliasing, no text. " +
  "The subject is a friendly modern software professional in contemporary casual clothes; " +
  "soft warm facial features, kind approachable eyes, absolutely no fighting gear, no scars. " +
  "FRAMING, IDENTICAL FOR EVERY PORTRAIT, RECTANGULAR FULL BLEED: the artwork fills the whole square " +
  "edge to edge; top of the hair sits 8 percent below the top edge; the bottom edge of the image cuts " +
  "the torso at mid chest; the shoulders and upper arms run off the left and right edges at the bottom " +
  "corners, cropped by the frame itself. STRICTLY FORBIDDEN: circular crop, rounded vignette, arc or " +
  "curve cutting the torso, badge shape, border, frame line, floating bust on empty background. " +
  "The chest and shoulders must be cut only by the straight edges of the image, exactly like a " +
  "fighting game select screen portrait. Three quarter view facing slightly left. " +
  "Background: completely flat dark navy, exact hex #0d0f14, no gradient, no props.";

// Six Turkish characters, each worked out individually: warm, soft features,
// distinct (but always friendly) expressions, role-colored rim light.
const CHARACTERS = [
  {
    key: "analyst",
    desc:
      "A 26 year old Turkish man from Istanbul with soft Mediterranean features: olive skin, " +
      "warm dark brown eyes, neat short dark brown hair, clean shaven, thin round glasses, plain navy shirt. " +
      "Expression: gentle attentive smile, calm bright eyes, the friend who really listens. " +
      "Soft blue rim light (#60a5fa) on hair and shoulder.",
  },
  {
    key: "product_manager",
    desc:
      "A 28 year old Turkish woman with soft Mediterranean features: olive skin, warm brown eyes, " +
      "dark brown wavy hair falling to her shoulders, small gold earrings, violet blazer over a dark tee. " +
      "Expression: warm confident smile with gently raised cheeks, welcoming leader energy. " +
      "Soft violet rim light (#a78bfa) on hair and shoulder.",
  },
  {
    key: "developer",
    desc:
      "A 25 year old Turkish man with soft features: light olive skin, tousled dark hair, short well " +
      "groomed beard, warm hazel eyes, orange hoodie, black headphones resting around his neck. " +
      "Expression: cheerful open grin, kind and energetic, the teammate who loves to build. " +
      "Soft orange rim light (#fb923c) on hair and shoulder.",
  },
  {
    key: "project_manager",
    desc:
      "A 28 year old Turkish man with soft features: olive skin, short neatly combed black hair, " +
      "trimmed dark beard, warm brown eyes, light blue oxford shirt with open collar. " +
      "Expression: serene reassuring small smile, steady calm warmth, quietly dependable. " +
      "Soft green rim light (#4ade80) on hair and shoulder.",
  },
  {
    key: "product_designer",
    desc:
      "A 24 year old Turkish woman with soft features: light olive skin, long dark brown hair with " +
      "soft bangs and a small pink hair clip, silver earrings, black turtleneck, yellow pencil behind her ear. " +
      "Expression: joyful bright smile, sparkling curious eyes, playful creative warmth. " +
      "Soft pink rim light (#f472b6) on hair and shoulder.",
  },
  {
    key: "qa",
    desc:
      "A 24 year old Turkish woman with soft Mediterranean features: olive skin, shoulder length " +
      "dark brown hair in a loose low ponytail with strands framing her face, a few light freckles, " +
      "round thin-frame glasses, teal cardigan over a white tee. " +
      "Expression: big bright cheerful smile, warm sparkling eyes, the upbeat teammate who " +
      "delights in finding what everyone else missed. " +
      "Soft teal rim light (#2dd4bf) on hair and shoulder. " +
      "CRITICAL: her cardigan, chest and shoulders are WIDE and fill the entire bottom edge of the image " +
      "from the bottom left corner to the bottom right corner; zero background pixels are visible along " +
      "the bottom edge or in the bottom corners; the torso is cut off only by the straight bottom border.",
  },
];

// Per-character gesture for the _alt frame: each teammate gets their own
// signature move so the hover animation reads as personality, not a reskin.
const GESTURES = {
  analyst:
    "he raises one hand and thoughtfully pushes his round glasses up his nose, smiling a bit wider",
  product_manager:
    "she raises one hand in a confident thumbs up next to her shoulder, smile widening proudly",
  developer:
    "he raises one hand in a cheerful open-palm wave next to his shoulder, grin widening",
  project_manager:
    "he raises one hand making a calm OK sign next to his shoulder, with a reassuring nod-like tilt",
  product_designer:
    "she holds the yellow pencil up next to her cheek in her OWN hand, her own arm clearly entering " +
    "the frame from the bottom edge in her black turtleneck sleeve, winking one eye playfully",
  qa: "she raises a small magnifying glass in front of one eye playfully, the eye behind the lens " +
    "appearing slightly enlarged, smiling wide",
};

const BLINK_EDIT =
  "Edit this pixel art portrait: the character's eyes are now fully closed in a natural relaxed blink. " +
  "Keep EVERYTHING else pixel-identical: same pose, same framing, same colors, same clothes, same " +
  "background, same pixel grid. Only the eyes and eyebrows change.";

const altEdit = (gesture) =>
  `Edit this pixel art portrait: ${gesture}. The hand (and any held object) enters the frame from ` +
  "the bottom edge in the same 16-bit pixel art style with dark outlines and the same limited palette. " +
  "Keep EVERYTHING else pixel-identical: same face position, same framing, same colors, same clothes, " +
  "same background, same pixel grid.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(prompt, refBuffer) {
  const parts = [];
  if (refBuffer) {
    parts.push({
      inline_data: { mime_type: "image/png", data: refBuffer.toString("base64") },
    });
  }
  parts.push({ text: prompt });
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "1:1" },
    },
  });

  // The model 503s under load spikes; retry with exponential backoff.
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await sleep(5000 * 2 ** (attempt - 1) + Math.random() * 2000);
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.status === 503 || res.status === 429) {
        lastErr = new Error(`HTTP ${res.status} (retrying)`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const json = await res.json();
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) {
        lastErr = new Error("no image in response (retrying)");
        continue;
      }
      return Buffer.from(part.inlineData.data, "base64");
    } catch (err) {
      lastErr = err; // network hiccups included
    }
  }
  throw lastErr ?? new Error("generation failed");
}

const outDir = path.join(import.meta.dirname, "..", "assets", "avatars");
await mkdir(outDir, { recursive: true });

const args = process.argv.slice(2);
const altOnly = args.includes("--alt");
const only = args.filter((a) => a !== "--alt");
const todo = only.length
  ? CHARACTERS.filter((c) => only.includes(c.key))
  : CHARACTERS;

let failures = 0;
for (const { key, desc } of todo) {
  // Base frame (or reuse the one on disk in --alt mode)
  let base;
  if (altOnly) {
    base = await readFile(path.join(outDir, `${key}.png`));
  } else {
    process.stdout.write(`${key}: base... `);
    try {
      base = await generate(`${STYLE} Subject: ${desc}`);
      await writeFile(path.join(outDir, `${key}.png`), base);
      console.log(`ok (${Math.round(base.length / 1024)} KB)`);
    } catch (err) {
      failures++;
      console.log(`FAILED: ${err.message}`);
      continue;
    }
  }
  // Animation frames, edited from the base for consistency
  const frames = altOnly
    ? [["_alt", altEdit(GESTURES[key])]]
    : [
        ["_blink", BLINK_EDIT],
        ["_alt", altEdit(GESTURES[key])],
      ];
  for (const [suffix, prompt] of frames) {
    process.stdout.write(`${key}: ${suffix.slice(1)}... `);
    try {
      const buf = await generate(prompt, base);
      await writeFile(path.join(outDir, `${key}${suffix}.png`), buf);
      console.log(`ok (${Math.round(buf.length / 1024)} KB)`);
    } catch (err) {
      failures++;
      console.log(`FAILED: ${err.message}`);
    }
  }
}

process.exit(failures ? 1 : 0);
