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
const OUT = "/tmp/chars5";

const STYLE =
  "An authentic Street Fighter II / Capcom CPS arcade CHARACTER-SELECT PORTRAIT, 16-bit pixel art: WARM dramatic arcade lighting with a glowing warm rim light, rich saturated colors, deep contrast, bold black outlines, expressive friendly face, heroic confident energy (like a fighter portrait). Visible chunky pixels and a limited retro palette: it must read as a real SNES game portrait, NOT a smooth modern cartoon, NOT vector, NOT 3D. CLEARLY TURKISH / Anatolian features (warm Mediterranean skin, dark brown or black hair and brows, expressive dark eyes). FROM THE CHEST UP, centered, facing 3/4, warm and likable. The character's HANDS ARE EMPTY, holding NOTHING, no objects, no props, no tools whatsoever. SOLID FLAT background in {BG} (no gradient, no scene). ABSOLUTELY NO text, no letters, no numbers, no watermark, no logo, no UI, no border.";

const CREW = [
  {
    key: "analyst",
    bg: "warm cobalt blue",
    persona:
      "Mert, a warm friendly Turkish data analyst man, 25 years old (young, fresh faced), warm Mediterranean skin, short dark brown wavy hair, clean shaven or very light stubble, round glasses, casual blue tee or hoodie. Empty hands.",
    gesture:
      "raising his index finger as if struck by a bright insight, warm grin (hands otherwise empty)",
  },
  {
    key: "product_manager",
    bg: "warm violet purple",
    persona:
      "Elif, a warm confident Turkish product manager woman, 35 years old (poised, experienced), warm olive skin, shoulder-length dark brown hair, smart-casual blazer over a tee. Empty hands.",
    gesture: "giving a warm confident thumbs-up with an encouraging smile (empty hands)",
  },
  {
    key: "project_manager",
    bg: "warm emerald green",
    persona:
      "Kerem, a warm dependable Turkish project manager man, 35 years old (seasoned, calm), warm tan skin, neat dark hair with a friendly trimmed black mustache, casual collared shirt. Empty hands.",
    gesture: "making a friendly OK hand sign near his shoulder with a warm nod (empty hands)",
  },
  {
    key: "product_designer",
    bg: "warm hot pink magenta",
    persona:
      "Zeynep, a warm playful Turkish product designer woman, 28 years old, warm light-brown skin, stylish dark bob with a subtle magenta streak, creative spark. Empty hands, no headphones, no props.",
    gesture: "flashing a warm cheeky peace / victory sign with a playful wink (empty hands)",
  },
  {
    key: "qa",
    bg: "warm teal",
    persona:
      "Can, a warm sharp-eyed Turkish QA engineer man, 28 years old, warm deep-tan skin, short cropped dark hair and light stubble, comfy teal tee or hoodie. Empty hands.",
    gesture:
      "pointing forward with one finger and a warm confident grin, like he just spotted something (empty hands)",
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
