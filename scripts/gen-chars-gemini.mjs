// Generate the Onit crew via Gemini (Nano Banana, gemini-2.5-flash-image).
// Per character: a neutral 16-bit fighting-game portrait, then a gesture frame
// produced by EDITING the neutral (same character, only the pose changes) so the
// two frames stay perfectly consistent.
//
//   node --env-file=.env.local scripts/gen-chars-gemini.mjs
//
// Writes PNGs to /tmp/chars2/<key>.png and <key>_wave.png.
import { writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
const OUT = "/tmp/chars3";

const STYLE =
  "REAL 16-bit pixel art in the exact style of Street Fighter II / Capcom CPS arcade sprites: clearly visible big square pixels and pixel dithering, a limited retro palette (~24 colors), bold black 1px outlines, blocky stair-stepped cel shading. It MUST look like an authentic upscaled SNES game sprite — NOT smooth, NOT anti-aliased, NOT vector, NOT 3D render, NOT a modern cartoon or comic illustration. Strong chunky pixelation is required. Head-and-shoulders fighter character-select bust, centered, facing 3/4, filling the frame. SOLID FLAT background in {BG} (no gradient, no scene). ABSOLUTELY NO text, no letters, no numbers, no watermark, no logo, no UI, no border.";

const CREW = [
  {
    key: "analyst",
    bg: "deep cobalt blue",
    persona:
      "Mert, a sharp curious Turkish data analyst man, late 20s, warm tan skin, short dark wavy hair, light stubble, round glasses, smart blue collared shirt, confident friendly look",
    gesture:
      "pushing his glasses up with one hand and raising his index finger as if struck by a bright insight, eyes lit up",
  },
  {
    key: "product_manager",
    bg: "rich violet purple",
    persona:
      "Elif, a confident charismatic Turkish product manager woman, early 30s, fair warm skin, shoulder-length auburn hair, sharp violet blazer over a tee, warm decisive smile",
    gesture: "giving a strong confident thumbs-up with a warm encouraging smile",
  },
  {
    key: "project_manager",
    bg: "deep emerald green",
    persona:
      "Kerem, a dependable calm Turkish project manager man, early 30s, light-tan skin, neat dark hair with a trimmed mustache, green button-up shirt with rolled sleeves, steady reassuring expression",
    gesture: "making a calm OK hand sign near his shoulder with a reassuring nod",
  },
  {
    key: "product_designer",
    bg: "vivid hot pink magenta",
    persona:
      "Zeynep, a playful stylish Turkish product designer woman, late 20s, medium-brown skin, chic dark bob with a magenta streak, over-ear headphones around her neck, creative spark in her eyes",
    gesture: "flashing a cheeky peace / victory sign with a playful wink",
  },
  {
    key: "qa",
    bg: "deep teal",
    persona:
      "Can, a vigilant sharp-eyed Turkish QA engineer man, late 20s, deep-tan skin, short cropped hair and light stubble, teal hoodie, focused confident smirk",
    gesture:
      "pointing sharply forward at the viewer with one finger as if he just caught a bug, confident playful smirk",
  },
];

async function call(parts) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 160)}`);
      }
      const j = await res.json();
      const img = (j.candidates?.[0]?.content?.parts || []).find(
        (p) => p.inlineData,
      );
      if (!img) throw new Error("no image in response");
      return Buffer.from(img.inlineData.data, "base64");
    } catch (e) {
      console.log(`  retry ${attempt + 1}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error("failed after retries");
}

await mkdir(OUT, { recursive: true });
for (const c of CREW) {
  console.log(`\n=== ${c.key} ===`);
  const stylePrompt = STYLE.replace("{BG}", c.bg);

  console.log("  neutral…");
  const neutral = await call([
    { text: `${stylePrompt}\n\nCharacter: ${c.persona}. Neutral confident stance.` },
  ]);
  await writeFile(`${OUT}/${c.key}.png`, neutral);
  console.log(`  saved ${c.key}.png (${neutral.length} bytes)`);

  console.log("  gesture (edit of neutral)…");
  const wave = await call([
    {
      inlineData: {
        mimeType: "image/png",
        data: neutral.toString("base64"),
      },
    },
    {
      text: `Edit this exact character: keep the identical face, hair, outfit, art style, 16-bit pixel-art palette, framing and the solid ${c.bg} background. Change ONLY the pose — now ${c.gesture}. Same SNES fighting-game portrait. ABSOLUTELY NO text, no letters, no watermark.`,
    },
  ]);
  await writeFile(`${OUT}/${c.key}_wave.png`, wave);
  console.log(`  saved ${c.key}_wave.png (${wave.length} bytes)`);
}
console.log("\nDONE");
