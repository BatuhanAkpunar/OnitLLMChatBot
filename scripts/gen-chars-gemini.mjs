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
const OUT = "/tmp/chars4";

const STYLE =
  "An authentic Street Fighter II / Capcom CPS arcade CHARACTER-SELECT PORTRAIT, 16-bit pixel art: WARM dramatic arcade lighting with a glowing warm rim light, rich saturated colors, deep contrast, bold black outlines, expressive friendly face, heroic confident energy (like a fighter portrait). Visible chunky pixels and limited retro palette — it must read as a real SNES game portrait, NOT a smooth modern cartoon, NOT vector, NOT 3D. Head-and-shoulders bust, centered, facing 3/4, warm and likable. SOLID FLAT background in {BG} (no gradient, no scene). ABSOLUTELY NO text, no letters, no numbers, no watermark, no logo, no UI, no border.";

const CREW = [
  {
    key: "analyst",
    bg: "warm cobalt blue",
    persona:
      "Mert, a warm friendly Turkish data analyst man, late 20s, warm olive skin, short dark wavy hair, light stubble, round glasses, casual blue hoodie over a tee, holding a steaming coffee mug — the data nerd who lives in dashboards, curious and likable",
    gesture:
      "lifting his coffee mug slightly and raising his index finger as if struck by a bright insight, warm grin",
  },
  {
    key: "product_manager",
    bg: "warm violet purple",
    persona:
      "Elif, a warm confident Turkish product manager woman, early 30s, warm fair skin, shoulder-length auburn hair, smart-casual blazer over a tee, a couple of colorful sticky notes stuck on her shoulder — decisive and friendly",
    gesture: "giving a warm confident thumbs-up with an encouraging smile",
  },
  {
    key: "project_manager",
    bg: "warm emerald green",
    persona:
      "Kerem, a warm dependable Turkish project manager man, early 30s, warm tan skin, neat dark hair with a friendly trimmed mustache, casual plaid shirt, holding a small clipboard with sticky notes — the calm organizer everyone trusts",
    gesture: "making a friendly OK hand sign near his shoulder with a warm reassuring nod",
  },
  {
    key: "product_designer",
    bg: "warm hot pink magenta",
    persona:
      "Zeynep, a warm playful Turkish product designer woman, late 20s, warm brown skin, a cozy beanie over a dark bob with a magenta streak, big over-ear headphones, holding a stylus by a tablet — creative and bubbly",
    gesture: "flashing a warm cheeky peace / victory sign with a playful wink",
  },
  {
    key: "qa",
    bg: "warm teal",
    persona:
      "Can, a warm sharp-eyed Turkish QA engineer man, late 20s, warm deep-tan skin, short cropped hair and light stubble, comfy teal hoodie, holding a magnifying glass over a tiny cute bug — the friendly bug hunter",
    gesture:
      "holding up his magnifying glass and pointing forward with a warm confident grin, like he just caught a bug",
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
