// Generates the 6 pixel-art role portraits via the Gemini API (Nano Banana)
// and writes them to public/avatars/<key>.png.
//
// Usage: node --env-file=.env.local scripts/gen-avatars.mjs
// Requires GEMINI_API_KEY in .env.local (never committed; .env.local is gitignored).

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("GEMINI_API_KEY missing in .env.local");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash-image";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

// Street Fighter 2 character-select portrait AESTHETIC (pixel craft only, the
// subjects are modern software professionals, never fighters), with one rigid
// framing spec so all six portraits crop identically.
const STYLE =
  "Pixel art portrait in the exact visual style of a Street Fighter 2 arcade character select screen: " +
  "bold 16-bit pixel art, confident dark pixel outlines, chunky cel shading with subtle dithering, " +
  "saturated colors, limited 16 color palette, crisp hard pixels, no anti-aliasing, no text, no frame. " +
  "The subject is a modern software professional in contemporary casual clothes; " +
  "absolutely no fighting gear, no headbands, no scars, no martial arts costume. " +
  "STANDARD FRAMING, IDENTICAL FOR EVERY PORTRAIT: bust crop; the top of the hair sits 8 percent below " +
  "the top edge; the bottom edge cuts at mid chest just below the collarbone; both shoulders fully " +
  "visible with about 10 percent margin to the left and right edges; head centered horizontally; " +
  "eyes sit on the upper third line; three quarter view facing slightly left; same camera distance in every image. " +
  "Background: completely flat dark navy, exact hex #0d0f14, no gradient, no props.";

const CHARACTERS = [
  {
    key: "analyst",
    desc: "A 26 year old East Asian man, neat side-parted black hair, thin round glasses, plain navy shirt. Expression: deep focused concentration, eyebrows slightly knitted, lips pressed together. Soft blue rim light (#60a5fa) on hair and shoulder.",
  },
  {
    key: "product_manager",
    desc: "A 28 year old Black woman, short natural curly hair, small gold hoop earrings, violet blazer over a dark tee. Expression: confident wide smile showing teeth, chin slightly up, leader energy. Soft violet rim light (#a78bfa) on hair and shoulder.",
  },
  {
    key: "developer",
    desc: "A 25 year old man with light stubble, messy brown hair, orange hoodie, black headphones resting around his neck. Expression: smug lopsided grin, one corner of the mouth raised, relaxed eyes. Soft orange rim light (#fb923c) on hair and shoulder.",
  },
  {
    key: "project_manager",
    desc: "A 28 year old man, tidy dark undercut haircut, clean shaven, light blue oxford shirt with the top button open. Expression: composed neutral face, steady calm gaze straight ahead, no smile. Soft green rim light (#4ade80) on hair and shoulder.",
  },
  {
    key: "product_designer",
    desc: "A 24 year old Latina woman, asymmetrical dark bob with a pink streak, small silver earrings, black turtleneck, yellow pencil tucked behind her ear. Expression: curious and inspired, eyebrows raised, bright wide eyes, soft open smile. Soft pink rim light (#f472b6) on hair and shoulder.",
  },
  {
    key: "qa",
    desc: "A 27 year old man, dark beanie, rectangular glasses, teal jacket over a graphite tee. Expression: skeptical squint, one eyebrow sharply raised, wry half smile on one side. Soft teal rim light (#2dd4bf) on hair and shoulder.",
  },
];

const outDir = path.join(import.meta.dirname, "..", "public", "avatars");
await mkdir(outDir, { recursive: true });

let failures = 0;
for (const { key, desc } of CHARACTERS) {
  process.stdout.write(`generating ${key}... `);
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${STYLE} Subject: ${desc}` }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1" },
        },
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) throw new Error("no image in response");
    const buf = Buffer.from(part.inlineData.data, "base64");
    await writeFile(path.join(outDir, `${key}.png`), buf);
    console.log(`ok (${Math.round(buf.length / 1024)} KB)`);
  } catch (err) {
    failures++;
    console.log(`FAILED: ${err.message}`);
  }
}

process.exit(failures ? 1 : 0);
