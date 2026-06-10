"use client";

import { useEffect, useRef } from "react";

/**
 * Aurora background: a flowing northern-lights band across the top of the
 * hero. Same effect as the React Bits <Aurora /> (simplex ridge noise plus a
 * three-stop horizontal color ramp), ported to raw WebGL2 so it needs no
 * dependencies. Theme-aware colors, reduced-motion renders a single frame.
 */

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLight;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 ramp(float t) {
  return t < 0.5
    ? mix(uColorStops[0], uColorStops[1], t * 2.0)
    : mix(uColorStops[1], uColorStops[2], (t - 0.5) * 2.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec3 rampColor = ramp(uv.x);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  // Dark mode: glow from black (the classic aurora). Light mode: tint from
  // white toward the ramp color so the band stays bright, never muddy.
  vec3 auroraColor = uLight > 0.5
    ? mix(vec3(1.0), rampColor, clamp(intensity, 0.0, 1.0) * 0.85)
    : intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Three stops, left to right: violet, indigo, sky (the brand ramp).
const THEMES: Record<"light" | "dark", [Rgb, Rgb, Rgb]> = {
  dark: [hexToRgb("#a78bfa"), hexToRgb("#6366f1"), hexToRgb("#38bdf8")],
  // Same ramp in light mode; the shader mixes it from white instead of black.
  light: [hexToRgb("#a78bfa"), hexToRgb("#6366f1"), hexToRgb("#38bdf8")],
};

export function Aurora({
  className = "",
  amplitude = 1.0,
  blend = 0.5,
  speed = 0.7,
}: {
  className?: string;
  amplitude?: number;
  blend?: number;
  speed?: number;
}) {
  const ctnRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctn = ctnRef.current;
    const canvas = canvasRef.current;
    if (!ctn || !canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true });
    if (!gl) return; // no WebGL2: the flat background simply stays

    function shader(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAmplitude = gl.getUniformLocation(prog, "uAmplitude");
    const uColorStops = gl.getUniformLocation(prog, "uColorStops");
    const uResolution = gl.getUniformLocation(prog, "uResolution");
    const uBlend = gl.getUniformLocation(prog, "uBlend");
    const uLight = gl.getUniformLocation(prog, "uLight");

    gl.uniform1f(uAmplitude, amplitude);
    gl.uniform1f(uBlend, blend);

    function applyTheme() {
      const dark = document.documentElement.classList.contains("dark");
      const stops = dark ? THEMES.dark : THEMES.light;
      gl!.uniform3fv(uColorStops, new Float32Array(stops.flat()));
      gl!.uniform1f(uLight, dark ? 0 : 1);
    }
    applyTheme();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const w = Math.max(1, Math.round(ctn!.offsetWidth * dpr));
      const h = Math.max(1, Math.round(ctn!.offsetHeight * dpr));
      canvas!.width = w;
      canvas!.height = h;
      gl!.viewport(0, 0, w, h);
      gl!.uniform2f(uResolution, w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(ctn);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    function draw(now: number) {
      gl!.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    function loop(now: number) {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    }
    if (reduced) {
      draw(8000);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    const mo = new MutationObserver(() => {
      applyTheme();
      if (reduced) draw(8000);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [amplitude, blend, speed]);

  return (
    <div ref={ctnRef} className={`pointer-events-none ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
