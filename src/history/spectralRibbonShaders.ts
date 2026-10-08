// Adapted from Componentry Spectral Ribbon, copyright (c) 2026 Harsh Jadhav (MIT).
// Source: https://componentry.dev/r/spectral-ribbon.json
// Licence: public/licenses/componentry.txt
// Aquinas palette, softer bloom and one continuous curve through scroll-space.

export const VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_res;
uniform vec2 u_curve[49];
uniform float u_time, u_offset, u_intensity, u_thickness, u_grain;
uniform vec3 u_base, u_accent;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, 1.0 - uv.y);
  // Noise shares the curve's longitudinal coordinate, so no section seams.
  float warp = fbm(vec2(p.x, p.y + u_offset) * 1.2 + vec2(u_time * 0.1, -u_time * 0.07));
  p += (warp - 0.5) * 0.07;

  float minDist = 1e5;
  float side = 0.0;
  vec2 prev = u_curve[0];
  for (int i = 1; i <= 48; i++) {
    vec2 cur = u_curve[i];
    vec2 pa = p - prev;
    vec2 ba = cur - prev;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    float d = length(pa - ba * h);
    if (d < minDist) {
      minDist = d;
      side = pa.x * ba.y - pa.y * ba.x;
    }
    prev = cur;
  }

  float thick = 0.044 * u_thickness;
  float across = clamp(minDist * sign(side) / (thick * 2.8), -1.2, 1.2);
  float core = exp(-pow(minDist / (thick * 0.7), 2.0));
  float body = exp(-pow(minDist / (thick * 1.8), 2.0));
  float bloom = exp(-pow(minDist / (thick * 4.2), 2.0));
  float haze = exp(-pow(minDist / (thick * 7.5), 2.0));

  // Keep the Aquinas red hue through both the fringe and the brighter core.
  vec3 spectral = u_accent * mix(0.65, 1.0, smoothstep(-0.8, 0.65, across));
  spectral = mix(u_accent, spectral, smoothstep(0.0, 0.55, abs(across)));
  vec3 light = spectral * (body * 0.42 + bloom * 0.5 + haze * 0.15);
  light += u_accent * core * 0.28;
  float mask = clamp(body * 0.7 + bloom + haze * 0.3, 0.0, 1.3);
  vec3 col = u_base + light * u_intensity * mask;
  float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.035 * u_grain;
  col += grain * mask;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
