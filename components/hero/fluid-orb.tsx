"use client";

import { useEffect, useRef } from "react";

/**
 * The Onit core: a living fluid blob (raymarched, noise-displaced sphere with
 * fresnel rim), the brand's power source. Raw WebGL fragment shader, zero
 * dependencies. Theme-aware colors, mouse-reactive surface, reduced-motion
 * and no-WebGL fallbacks.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

// Organic surface displacement, sampled on the sphere direction so the
// surface flows like liquid (same recipe as the classic displaced blob).
float disp(vec3 d) {
  float n1 = noise(d * 2.3 + vec3(0.0, 0.0, uTime * 0.22)) - 0.5;
  float n2 = noise(d * 4.8 - vec3(0.0, uTime * 0.16, 0.0)) - 0.5;
  float s = n1 * 0.34 + n2 * 0.12;
  float md = distance(d.xy, uMouse * 1.1);
  s -= (1.0 - smoothstep(0.0, 1.3, md)) * 0.18;
  return s;
}

float map(vec3 p) {
  float c = cos(uTime * 0.1);
  float s = sin(uTime * 0.1);
  p.xz = mat2(c, -s, s, c) * p.xz;
  return length(p) - 0.78 - disp(normalize(p));
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.012, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

void main() {
  vec2 q = vUv * 2.0 - 1.0;
  vec3 ro = vec3(0.0, 0.0, 2.4);
  vec3 rd = normalize(vec3(q * 0.78, -1.0));

  float t = 0.8;
  float hit = -1.0;
  for (int i = 0; i < 72; i++) {
    vec3 pos = ro + rd * t;
    float d = map(pos);
    if (d < 0.0025) { hit = t; break; }
    if (t > 4.2) break;
    t += d * 0.6;
  }

  if (hit < 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 pos = ro + rd * hit;
  vec3 N = calcNormal(pos);

  vec3 col = mix(uColorB, uColorA, N.y * 0.5 + 0.5);
  float fres = pow(1.0 - abs(dot(N, -rd)), 2.0);
  col += uColorA * fres * 0.55 + vec3(1.0) * fres * 0.22;
  float spec = pow(max(dot(reflect(rd, N), normalize(vec3(0.6, 0.7, 0.4))), 0.0), 24.0);
  col += vec3(1.0) * spec * 0.18;

  gl_FragColor = vec4(col, 1.0);
}
`;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const THEMES: Record<"light" | "dark", { a: Rgb; b: Rgb }> = {
  dark: { a: hexToRgb("#a78bfa"), b: hexToRgb("#4c1d95") },
  // Pastel in light mode so dark hero text stays readable on top of it.
  light: { a: hexToRgb("#ede9fe"), b: hexToRgb("#a78bfa") },
};

export function FluidOrb({
  size = 560,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx =
      canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true }) ??
      canvas.getContext("experimental-webgl", { alpha: true });
    if (!ctx || !(ctx instanceof WebGLRenderingContext)) {
      // No WebGL: keep the CSS fallback visible instead.
      canvas.style.display = "none";
      if (fallbackRef.current) fallbackRef.current.style.display = "block";
      return;
    }
    const gl: WebGLRenderingContext = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    function shader(type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      if (fallbackRef.current) fallbackRef.current.style.display = "block";
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uColorA = gl.getUniformLocation(prog, "uColorA");
    const uColorB = gl.getUniformLocation(prog, "uColorB");

    function applyTheme() {
      const t = document.documentElement.classList.contains("dark")
        ? THEMES.dark
        : THEMES.light;
      gl.uniform3fv(uColorA, t.a);
      gl.uniform3fv(uColorB, t.b);
    }
    applyTheme();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let visible = true;
    const start = performance.now();

    function draw(now: number) {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now: number) {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    }

    if (reduced) {
      draw(8000); // a single, pleasant frame
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    if (!reduced) window.addEventListener("mousemove", onMove);

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
      window.removeEventListener("mousemove", onMove);
      io.disconnect();
      mo.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [size]);

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div
        ref={fallbackRef}
        style={{
          display: "none",
          width: size,
          height: size,
          marginTop: -size,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 34%, #c4b5fd 0%, #8b5cf6 38%, #4c1d95 72%, transparent 73%)",
        }}
      />
    </div>
  );
}
