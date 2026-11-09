/**
 * GPU passes for the flowing edit (make-anime-music-video): aura pouring off a cutout, liquid morphs
 * from one shot into the next, liquid paint over a shot, portals. A pass is one WebGL2 canvas with a
 * fragment shader. Its inputs are exact-time frames of footage, mattes or overlays (OffthreadVideo's
 * decoded frames, via onVideoFrame) and 2D canvases (words to set alight). While rendering, the frame
 * waits (delayRender) until every input of this frame has arrived and the pass has drawn.
 *
 * Shaders see `uv` (0..1, origin bottom left), `u_res` (canvas size in px) and a sampler `u_<id>` per
 * input; the other uniforms are the pass's own. Textures are uploaded flipped, so texture(u_x, uv) is
 * upright. Output is premultiplied: alpha 0 with colour adds light over what is underneath.
 */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { continueRender, delayRender, Freeze, getRemotionEnvironment, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

export type GLInput =
  /** a frame of a video at source time t (seconds) */
  | { id: string; src: string; t: number; transparent?: boolean }
  /** a 2D canvas drawn each frame (words, shapes); `key` changes whenever the drawing does */
  | { id: string; key: string; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void };

export type Uniforms = Record<string, number | number[]>;

const VERT = `#version 300 es
in vec2 a;
out vec2 uv;
void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

type GLState = {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  frag: string;
  tex: (id: string) => WebGLTexture;
  loc: (name: string) => WebGLUniformLocation | null;
  canvas2d: (id: string, w: number, h: number) => HTMLCanvasElement;
  dispose: () => void;
};

const numbered = (src: string) => src.split('\n').map((l, i) => `${String(i + 1).padStart(3)} ${l}`).join('\n');

const setup = (c: HTMLCanvasElement, frag: string): GLState => {
  const gl = c.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
  if (!gl) throw new Error('WebGL2 is not available: render with the ANGLE renderer (remotion.config.ts)');
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${gl.getShaderInfoLog(s)}\n${numbered(src)}`);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(prog, 0, 'a');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`${gl.getProgramInfoLog(prog)}`);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const texs = new Map<string, WebGLTexture>();
  const locs = new Map<string, WebGLUniformLocation | null>();
  const c2d = new Map<string, HTMLCanvasElement>();
  return {
    gl,
    prog,
    frag,
    tex: id => {
      let t = texs.get(id);
      if (!t) {
        t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        texs.set(id, t);
      }
      return t;
    },
    loc: name => {
      if (!locs.has(name)) locs.set(name, gl.getUniformLocation(prog, name));
      return locs.get(name)!;
    },
    canvas2d: (id, w, h) => {
      let cv = c2d.get(id);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        c2d.set(id, cv);
      }
      return cv;
    },
    dispose: () => {
      texs.forEach(t => gl.deleteTexture(t));
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
};

const setUniform = (gl: WebGL2RenderingContext, loc: WebGLUniformLocation | null, v: number | number[]) => {
  if (loc === null) return;
  if (typeof v === 'number') gl.uniform1f(loc, v);
  else if (v.length === 2) gl.uniform2fv(loc, v);
  else if (v.length === 3) gl.uniform3fv(loc, v);
  else if (v.length === 4) gl.uniform4fv(loc, v);
  else if (v.length === 9) gl.uniformMatrix3fv(loc, false, v);
  else gl.uniform1fv(loc, v);
};

const keyOf = (i: GLInput) => ('src' in i ? `${i.src}@${i.t.toFixed(4)}` : `${i.id}:${i.key}`);

/**
 * One shader pass over the frame. `mips` names inputs sampled with textureLod (soft glows): they get
 * mipmaps after each upload.
 */
export const GLPass: React.FC<{
  frag: string;
  inputs: GLInput[];
  uniforms?: Uniforms;
  mips?: string[];
  style?: React.CSSProperties;
}> = ({ frag, inputs, uniforms = {}, mips = [], style }) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const rendering = getRemotionEnvironment().isRendering;
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<GLState | null>(null);
  const got = useRef<Record<string, { key: string; el: TexImageSource }>>({});
  const pending = useRef<number | null>(null);
  const latest = useRef({ frag, inputs, uniforms, mips });
  latest.current = { frag, inputs, uniforms, mips };

  const drawNow = (): boolean => {
    const c = canvas.current;
    if (!c) return false;
    const cur = latest.current;
    for (const i of cur.inputs) {
      if (!('src' in i)) continue;
      const g = got.current[i.id];
      if (!g || (rendering && g.key !== keyOf(i))) return false;
    }
    let st = state.current;
    if (!st || st.frag !== cur.frag) {
      st?.dispose();
      st = state.current = setup(c, cur.frag);
    }
    const { gl } = st;
    gl.viewport(0, 0, c.width, c.height);
    gl.useProgram(st.prog);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    cur.inputs.forEach((i, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, st!.tex(i.id));
      let src: TexImageSource;
      if ('src' in i) src = got.current[i.id].el;
      else {
        const cv = st!.canvas2d(i.id, c.width, c.height);
        const ctx = cv.getContext('2d')!;
        ctx.clearRect(0, 0, cv.width, cv.height);
        i.draw(ctx, cv.width, cv.height);
        src = cv;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      if (cur.mips.includes(i.id)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.uniform1i(st!.loc(`u_${i.id}`), unit);
    });
    gl.uniform2f(st.loc('u_res'), c.width, c.height);
    for (const [k, v] of Object.entries(cur.uniforms)) setUniform(gl, st.loc(k), v);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  };

  const want = inputs.map(keyOf).join('|');
  const uniKey = JSON.stringify(uniforms);

  // one callback per input and frame: the decoded frame it brings is for that key
  const callbacks = useMemo(
    () =>
      Object.fromEntries(
        inputs.map(i => [
          i.id,
          (el: CanvasImageSource) => {
            got.current[i.id] = { key: keyOf(i), el: el as TexImageSource };
            if (!rendering) {
              drawNow();
              return;
            }
            if (pending.current !== null && drawNow()) {
              const h = pending.current;
              pending.current = null;
              continueRender(h);
            }
          },
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [want, rendering],
  );

  useLayoutEffect(() => {
    if (!rendering) {
      drawNow();
      return;
    }
    const h = delayRender('amv gl pass', { timeoutInMilliseconds: 90000 });
    pending.current = h;
    if (drawNow()) {
      pending.current = null;
      continueRender(h);
    }
    return () => {
      if (pending.current === h) {
        pending.current = null;
        continueRender(h);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, want, uniKey, frag]);

  useLayoutEffect(
    () => () => {
      state.current?.dispose();
      state.current = null;
    },
    [],
  );

  return (
    <>
      {inputs.map(i =>
        'src' in i ? (
          <Sequence key={i.id} layout="none">
            <Freeze frame={0}>
              <OffthreadVideo
                src={i.src}
                startFrom={Math.max(0, i.t * fps)}
                muted
                transparent={i.transparent}
                onVideoFrame={callbacks[i.id]}
                style={{ position: 'absolute', left: 0, top: 0, width: 4, height: 4, opacity: 0, pointerEvents: 'none' }}
              />
            </Freeze>
          </Sequence>
        ) : null,
      )}
      <canvas ref={canvas} width={width} height={height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }} />
    </>
  );
};

/* ------------------------------------------------------------------------------------------------ */
/* shader library                                                                                    */

const HEAD = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 o;
uniform vec2 u_res;
uniform float u_t;
`;

/** simplex noise (Ashima Arts / Ian McEwan, MIT), fbm, curl, the CSS colour filters, the camera */
const LIB = `
vec3 m289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 m289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 perm(vec4 x) { return m289(((x * 34.0) + 1.0) * x); }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = m289(i);
  vec4 p = perm(perm(perm(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 nr = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= nr.x; p1 *= nr.y; p2 *= nr.z; p3 *= nr.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
float fbm3(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
vec2 curl(vec2 p, float z) {
  float e = 0.02;
  float a = fbm(vec3(p + vec2(0.0, e), z)), b = fbm(vec3(p - vec2(0.0, e), z));
  float c = fbm(vec3(p + vec2(e, 0.0), z)), d = fbm(vec3(p - vec2(e, 0.0), z));
  return vec2(a - b, -(c - d)) / (2.0 * e);
}
// the CSS filters (contrast, saturate, brightness) in the same order the shots use them
vec3 cc(vec3 c, vec3 k) {
  c = (c - 0.5) * k.x + 0.5;
  float s = k.y;
  mat3 m = mat3(0.213 + 0.787 * s, 0.213 - 0.213 * s, 0.213 - 0.213 * s,
                0.715 - 0.715 * s, 0.715 + 0.285 * s, 0.715 - 0.715 * s,
                0.072 - 0.072 * s, 0.072 - 0.072 * s, 0.072 + 0.928 * s);
  c = m * c;
  return clamp(c * k.z, 0.0, 1.0);
}
// a shot's camera (ShotLayer: translate(tx,ty) rotate(rot) scale(zx,zy) about the centre) inverted:
// screen uv -> the picture's uv. cam = (tx, ty, zx, zy) in px, rot in radians.
vec2 camUV(vec2 p, vec4 cam, float rot) {
  vec2 P = vec2(p.x * u_res.x, (1.0 - p.y) * u_res.y);
  vec2 d = P - 0.5 * u_res - cam.xy;
  float c = cos(rot), s = sin(rot);
  d = vec2(c * d.x + s * d.y, -s * d.x + c * d.y) / cam.zw;
  vec2 Q = 0.5 * u_res + d;
  return vec2(Q.x / u_res.x, 1.0 - Q.y / u_res.y);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

/**
 * Aura: energy pouring off the subject. Inputs `pic` (the shot) and `matte` (its BiRefNet matte, grey;
 * or words drawn white on a 2D canvas). Draws only the light and the subject, so it sits over the shot
 * in the shot's own camera space. u_c1 = core colour, u_c2 = outer colour, u_amt = strength (0..2),
 * u_rise = how far the tongues climb (fraction of the frame), u_sub = 1 to draw the subject itself
 * (0 for words: the letters come from the type layer), u_k = the shot's colour correction, u_dim =
 * how much the world around him darkens so the light reads (0..1), u_over = how much of the light
 * lands on the subject itself (0.65 for a person; 0 for letters, which must stay readable), u_halo =
 * a dark halo hugging the subject (letters on a bright frame).
 */
export const AURA = `${HEAD}
uniform sampler2D u_pic;
uniform sampler2D u_matte;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform float u_amt;
uniform float u_rise;
uniform float u_sub;
uniform vec3 u_k;
uniform float u_dim;
uniform float u_over;
uniform float u_halo;
${LIB}
void main() {
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 q = uv * asp;
  float t = u_t;
  float a = texture(u_matte, uv).r;
  // the flow the light rides: up, curling
  vec2 fl = curl(q * 2.2 + vec2(0.0, -t * 0.35), t * 0.25) * 0.012;
  float n1 = fbm(vec3(q * vec2(5.0, 2.6) + vec2(0.0, -t * 1.5), t * 0.6));
  float n2 = fbm(vec3(q * vec2(9.0, 4.0) + vec2(3.1, -t * 2.4), t * 0.9));
  vec2 up = vec2(0.0, -u_rise);
  // soft copies of the matte, pulled up along the flow (near halo and long tongues)
  float h1 = textureLod(u_matte, uv + fl + up * 0.18, 3.0).r;
  float h2 = textureLod(u_matte, uv + fl * 2.0 + up * 0.5 * (0.6 + 0.4 * n1), 4.6).r;
  float h3 = textureLod(u_matte, uv + fl * 3.0 + up * (0.7 + 0.5 * n2), 5.6).r;
  float tongues = smoothstep(0.05, 0.75, n1 * 0.5 + 0.5 + n2 * 0.35);
  float outside = 1.0 - smoothstep(0.35, 0.9, a);
  // wisps: thin bright filaments (ridged noise) streaming up out of the halo
  float r1 = 1.0 - abs(snoise(vec3(q * vec2(7.0, 2.2) + vec2(0.0, -t * 2.0) + fl * 30.0, t * 0.5)));
  float r2 = 1.0 - abs(snoise(vec3(q * vec2(13.0, 4.0) + vec2(5.2, -t * 3.0) + fl * 40.0, t * 0.8)));
  float wisps = (pow(r1, 8.0) * 1.2 + pow(r2, 10.0) * 0.8) * clamp(h2 * 1.6 + h3 * 0.8, 0.0, 1.0) * outside;
  float glow = outside * (h1 * 1.25 + h2 * tongues * 1.5 + h3 * tongues * tongues * 1.1) + wisps * 1.6;
  // flicker in time (not per pixel): the energy breathes
  glow *= 0.85 + 0.15 * snoise(vec3(t * 3.1, 0.0, 7.0));
  vec3 col = mix(u_c2, u_c1, clamp(h1 * 1.6 - 0.2 + wisps, 0.0, 1.0)) * glow * u_amt;
  // rim: just inside the edge
  float inner = textureLod(u_matte, uv, 2.2).r;
  float rim = clamp((a - inner) * 3.5, 0.0, 1.0) + clamp((inner - a) * 2.0, 0.0, 1.0) * 0.6;
  col += u_c1 * rim * 0.9 * u_amt;
  vec3 subj = cc(texture(u_pic, uv).rgb, u_k);
  float sa = a * u_sub;
  // premultiplied: the subject covers, the world around him dims, the light adds
  float shade = clamp(u_dim + u_halo * clamp(h1 * 1.8, 0.0, 1.0), 0.0, 0.95) * (1.0 - sa);
  o = vec4(subj * sa + col * (1.0 - sa * (1.0 - u_over)), sa + shade);
}`;

/**
 * Liquid morph: the outgoing shot melts into the incoming one along a flowing front. Inputs `a`, `b`;
 * u_camA/u_camB + u_rotA/u_rotB are the two shots' cameras, u_kA/u_kB their colour corrections,
 * u_p = progress 0..1, u_tint = the colour of the light at the front, u_dir = the flow's direction.
 */
export const LIQUID = `${HEAD}
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform vec4 u_camA;
uniform vec4 u_camB;
uniform float u_rotA;
uniform float u_rotB;
uniform vec3 u_kA;
uniform vec3 u_kB;
uniform float u_p;
uniform vec3 u_tint;
uniform vec2 u_dir;
${LIB}
void main() {
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 q = uv * asp;
  float p = u_p;
  float s = sin(3.14159 * p);
  // the flow: big slow curls plus a finer ripple, pushed along u_dir (a few % of the frame at most)
  vec2 f = curl(q * 0.8, 4.0 + p * 0.6) * 0.009 + curl(q * 2.5 + 7.3, 2.0 + p * 1.2) * 0.003;
  vec2 d = (f + u_dir * 0.03) * s;
  // the front: a smooth noise threshold that sweeps across with p, led by u_dir
  float n = fbm3(vec3(q * 1.1 - u_dir * p * 0.8, 1.3)) * 0.5 + 0.5 + dot(uv - 0.5, u_dir) * 0.5;
  float front = p * 1.5 - 0.25;
  float m = smoothstep(n - 0.1, n + 0.1, front);
  float rim = 1.0 - abs(m * 2.0 - 1.0);
  // both shots push in a little through the middle of the morph
  vec2 z = (uv - 0.5) * (1.0 - 0.06 * s) + 0.5;
  vec2 ua = camUV(z + d * (1.0 + rim), u_camA, u_rotA);
  vec2 ub = camUV(z - d * (1.0 + rim), u_camB, u_rotB);
  // light splits at the front like it would through a lens of water
  vec2 cs = d * rim * 0.6;
  vec3 ca = vec3(texture(u_a, ua + cs).r, texture(u_a, ua).g, texture(u_a, ua - cs).b);
  vec3 cb = vec3(texture(u_b, ub + cs).r, texture(u_b, ub).g, texture(u_b, ub - cs).b);
  ca = cc(ca, u_kA);
  cb = cc(cb, u_kB);
  vec3 col = mix(ca, cb, m);
  col += rim * rim * (u_tint * 0.9 + 0.25) * s;
  o = vec4(col, 1.0);
}`;

/**
 * Smoke: the new shot comes through the old one's light first, broken up like smoke, with a glow on
 * the edge (the Kaneki morph, Darkside 0:32). Inputs and uniforms as in LIQUID.
 */
export const SMOKE = `${HEAD}
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform vec4 u_camA;
uniform vec4 u_camB;
uniform float u_rotA;
uniform float u_rotB;
uniform vec3 u_kA;
uniform vec3 u_kB;
uniform float u_p;
uniform vec3 u_tint;
${LIB}
void main() {
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 q = uv * asp;
  float p = u_p;
  float s = sin(3.14159 * p);
  vec2 flow = curl(q * 1.4, 2.0 + p * 0.8) * 0.006 * s;
  vec3 ca = cc(texture(u_a, camUV(uv + flow, u_camA, u_rotA)).rgb, u_kA);
  vec3 cb = cc(texture(u_b, camUV(uv - flow, u_camB, u_rotB)).rgb, u_kB);
  float n = fbm3(vec3(q * 2.2, 4.0 + p * 0.6)) * 0.5 + 0.5;
  float v = mix(1.0 - luma(ca), n, 0.55);
  float m = smoothstep(v - 0.12, v + 0.12, p * 1.4 - 0.2);
  float edge = 1.0 - abs(m * 2.0 - 1.0);
  vec3 col = mix(ca, cb, m) + edge * edge * (u_tint * 0.6 + 0.2) * s;
  o = vec4(col, 1.0);
}`;

/**
 * Liquid paint (Darkside 1:15): blobs of glowing liquid with dark outlines that refract the shot under
 * them and stream along u_dir. Input `pic` (the shot in its own camera space, like AURA). u_cov = how
 * much of the frame is liquid (0..1), u_tint = its colour, u_k = the shot's colour correction.
 * Opaque: it redraws the shot.
 */
export const PAINT = `${HEAD}
uniform sampler2D u_pic;
uniform float u_cov;
uniform vec3 u_tint;
uniform vec2 u_dir;
uniform vec3 u_k;
${LIB}
// streams, not spots: the noise is stretched along the flow and warped by a slow curl
float field(vec2 q, float t) {
  vec2 dir = normalize(u_dir);
  vec2 s = vec2(dot(q, dir) * 0.45, dot(q, vec2(-dir.y, dir.x)) * 1.15);
  vec2 w = s + curl(s * 0.7 + vec2(t * 0.25, 0.0), t * 0.1) * 0.012;
  return fbm3(vec3(w * 1.25 - vec2(t * 0.9, 0.0), t * 0.15)) * 0.5 + 0.5;
}
void main() {
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 q = uv * asp;
  float t = u_t;
  float f = field(q, t);
  float e = 1.5 / u_res.y;
  vec2 g = vec2(field(q + vec2(e, 0.0), t) - f, field(q + vec2(0.0, e), t) - f) / e;
  float thr = 1.0 - u_cov * 0.95;
  float aa = fwidth(f) * 1.5;
  float inside = smoothstep(thr - aa, thr + aa, f);
  float band = smoothstep(thr - 0.018 - aa, thr - 0.018 + aa, f) * (1.0 - inside);
  float depth = clamp((f - thr) * 6.0, 0.0, 1.0);
  vec2 ref = g * 0.02 * inside;
  vec3 under = cc(texture(u_pic, uv + ref).rgb, u_k);
  vec3 base = cc(texture(u_pic, uv).rgb, u_k);
  vec3 liquid = mix(under * 1.15, u_tint * (0.55 + 0.6 * luma(under)), 0.55 - depth * 0.25);
  liquid += pow(clamp(1.0 - depth * 2.5, 0.0, 1.0), 3.0) * inside * (u_tint * 0.8 + 0.3);
  vec3 col = mix(base, liquid, inside);
  col = mix(col, vec3(0.01, 0.03, 0.05), band * 0.92);
  o = vec4(col, 1.0);
}`;

/**
 * Knockout: the footage inside the letters (input `txt`, white on a 2D canvas), the rest darkened by
 * u_bga (0..1), a soft glow of u_glow round the letters. Input `pic` is the footage, full frame.
 */
export const KNOCK = `${HEAD}
uniform sampler2D u_pic;
uniform sampler2D u_txt;
uniform vec3 u_k;
uniform float u_bga;
uniform vec3 u_glow;
uniform float u_glowAmt;
${LIB}
void main() {
  float a = texture(u_txt, uv).r;
  float g = textureLod(u_txt, uv, 3.5).r;
  vec3 pic = cc(texture(u_pic, uv).rgb, u_k);
  vec3 col = pic * a + u_glow * max(0.0, g - a) * u_glowAmt;
  o = vec4(col, a + (1.0 - a) * u_bga);
}`;

/**
 * Portal: the incoming shot inside a burning ring at u_c (screen uv) of radius u_r (fraction of the
 * frame height), pushing in from u_zb to 1; past the frame's corners it is simply the new shot.
 * Inputs `a`, `b` with cameras and colour corrections as in LIQUID; u_ring = the ring's colour.
 */
export const PORTAL = `${HEAD}
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform vec4 u_camA;
uniform vec4 u_camB;
uniform float u_rotA;
uniform float u_rotB;
uniform vec3 u_kA;
uniform vec3 u_kB;
uniform vec2 u_c;
uniform float u_r;
uniform float u_zb;
uniform vec3 u_ring;
${LIB}
void main() {
  vec2 asp = vec2(u_res.x / u_res.y, 1.0);
  vec2 d = (uv - u_c) * asp;
  float r = length(d);
  float ang = atan(d.y, d.x);
  float wob = fbm(vec3(cos(ang) * 2.0, sin(ang) * 2.0, u_t * 1.5)) * 0.018;
  float edge = u_r + wob;
  float inside = 1.0 - smoothstep(edge - 0.003, edge + 0.003, r);
  vec3 ca = cc(texture(u_a, camUV(uv, u_camA, u_rotA)).rgb, u_kA);
  vec2 ubs = u_c + (uv - u_c) / u_zb;
  vec3 cb = cc(texture(u_b, camUV(ubs, u_camB, u_rotB)).rgb, u_kB);
  vec3 col = mix(ca * (1.0 - 0.35 * smoothstep(edge, edge + 0.4, r) * step(0.001, u_r)), cb, inside);
  float ring = exp(-pow((r - edge) / 0.012, 2.0));
  float fire = fbm(vec3(cos(ang) * 4.0, sin(ang) * 4.0 + u_t * 2.0, r * 8.0 - u_t * 3.0)) * 0.5 + 0.5;
  float flames = exp(-max(0.0, r - edge) / 0.05) * step(edge, r) * smoothstep(0.35, 0.9, fire);
  col += u_ring * (ring * 2.2 + flames * 1.4) + vec3(1.0) * ring * 0.8;
  o = vec4(col, 1.0);
}`;

/**
 * The smooth cuts (honoredone v7: "zoom in and cut and continue zoom in on next shot, use ease-out, same for left
 * translate, right translate… very fast… morph effects if you are zooming too much giving it a warp feel"): each
 * shot drawn in its own camera with an extra move on top, u_xA / u_xB = (scale, offset x, offset y, lens warp), with
 * real motion blur along that move's change over one frame (u_vA / u_vB = d scale, d x, d y), mirrored past the
 * picture's edges so a slide never shows black; u_mix = how much of the new shot shows (a hard switch at the cut, a
 * short melt for the warp); u_flash = a light pop on the cut. Amv.tsx works out the eased curves.
 */
export const ZOOMT = `${HEAD}
uniform sampler2D u_a;
uniform sampler2D u_b;
uniform vec4 u_camA;
uniform vec4 u_camB;
uniform float u_rotA;
uniform float u_rotB;
uniform vec3 u_kA;
uniform vec3 u_kB;
uniform vec4 u_xA;
uniform vec4 u_xB;
uniform vec3 u_vA;
uniform vec3 u_vB;
uniform float u_mix;
uniform float u_flash;
${LIB}
vec2 mirror(vec2 t) { return 1.0 - abs(1.0 - abs(t)); }
vec3 pic(sampler2D tex, vec4 cam, float rot, vec3 k, vec4 x, vec3 v) {
  float asp = u_res.x / u_res.y;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 14; i++) {
    float f = float(i) / 13.0 - 0.5;
    float s = max(0.05, x.x + v.x * f);
    vec2 off = x.yz + v.yz * f;
    vec2 d = uv - 0.5 - off;
    d.x *= asp;
    // the lens warp: the middle swells, the edges are pulled in
    float r2 = dot(d, d);
    d *= (1.0 - 0.42 * x.w) + 0.75 * x.w * r2;
    d.x /= asp;
    acc += cc(texture(tex, mirror(camUV(0.5 + d / s, cam, rot))).rgb, k);
  }
  return acc / 14.0;
}
void main() {
  vec3 a = u_mix < 0.999 ? pic(u_a, u_camA, u_rotA, u_kA, u_xA, u_vA) : vec3(0.0);
  vec3 b = u_mix > 0.001 ? pic(u_b, u_camB, u_rotB, u_kB, u_xB, u_vB) : vec3(0.0);
  o = vec4(mix(a, b, u_mix) * (1.0 + u_flash), 1.0);
}`;
