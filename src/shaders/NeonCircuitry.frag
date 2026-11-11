// ————————————————————————————————————————————————————————————
//  Neon Circuitry
//
//  A living printed circuit board, generated procedurally —
//  no textures, no buffers, a single pass, stateless.
//
//  Technique
//    · routing lattice — the plane is split into cells and every
//      cell owns one jittered feature point. Two neighbouring
//      cells get joined by an L-shaped "Manhattan" copper route
//      (one horizontal run, one vertical run) whenever a hash of
//      the unordered cell pair passes a density test. Axis-aligned
//      neighbours are joined far more often than diagonal ones,
//      which is what gives the layout its PCB signature.
//    · seamless joins — a pixel walks its own 3×3 cell
//      neighbourhood, but the two endpoints of every route are
//      canonically sorted first, so the pixels on either side of a
//      cell boundary solve for exactly the same segment: no gaps
//      and no doubled traces at the seams.
//    · signal pulses — the distance function also returns the
//      normalised arc-length coordinate of the closest point on
//      the route, so a travelling signal is just a Gaussian in
//      that coordinate. Two signals per trace at different speeds,
//      overlaid on per-trace neon flicker.
//    · vias — a gold bead on every lattice node, shaded with a
//      fake upper-left light and punched through by a dark drill.
//    · silkscreen — sparse component footprints on a half-scale
//      lattice, drawn as filled outlines.
//    · atmosphere — additive bloom fed by the very same distance
//      field, a slow scanning band, vignette and filmic rolloff.
// ————————————————————————————————————————————————————————————

uniform float iTime;
uniform vec3 iResolution;

// ——— hashes (no sin → they survive mediump precision) ————————
vec2 hash22(vec2 p) {
    vec3 q = fract(vec3(p.x, p.y, p.x) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.xx + q.yz) * q.zy);
}

float hash21(vec2 p) {
    vec3 q = fract(vec3(p.x, p.y, p.x) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

// Order-independent hash of a cell pair: min/max make it symmetric,
// so both cells sharing an edge derive the identical value.
vec2 pairHash(vec2 a, vec2 b) {
    vec2 lo = min(a, b);
    vec2 hi = max(a, b);
    return hash22(lo * 7.31 + hi * 3.17 + lo.y * hi.x * 0.131);
}

// Feature point of a cell, kept clear of the cell border.
vec2 nodePos(vec2 c) {
    return c + 0.18 + 0.64 * hash22(c + 0.5);
}

// Distance to a horizontal-then-vertical Manhattan route a → b,
// plus the normalised arc-length position of the closest point.
vec2 route(vec2 p, vec2 a, vec2 b) {
    vec2 corner = vec2(b.x, a.y);
    float lh = abs(b.x - a.x);
    float lv = abs(b.y - a.y);
    float tot = max(lh + lv, 0.001);

    // horizontal run: a → corner
    vec2 bh = corner - a;
    float th = clamp(dot(p - a, bh) / max(dot(bh, bh), 0.0001), 0.0, 1.0);
    float dh = length(p - a - bh * th);
    float sh = th * lh / tot;

    // vertical run: corner → b
    vec2 bv = b - corner;
    float tv = clamp(dot(p - corner, bv) / max(dot(bv, bv), 0.0001), 0.0, 1.0);
    float dv = length(p - corner - bv * tv);
    float sv = (lh + tv * lv) / tot;

    return (dh < dv) ? vec2(dh, sh) : vec2(dv, sv);
}

void main() {
    float resY = max(iResolution.y, 1.0);
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / resY;

    // ——— board space: SCALE cells across the visible height ———
    const float SCALE = 3.2;
    vec2 p = (uv + vec2(iTime * 0.055, iTime * 0.026)) * SCALE;

    float px = SCALE * 2.0 / resY;   // one pixel expressed in board units
    float aa = px * 1.4;             // anti-aliasing width
    float w = 0.048;                 // copper half-width

    vec2 cell = floor(p);
    vec2 P = nodePos(cell);

    // ——— accumulator layers ———
    vec3 copperRGB = vec3(0.0);
    float copperA = 0.0;
    vec3 pulseRGB = vec3(0.0);
    vec3 glow = vec3(0.0);
    float viaMask = 0.0;
    float drillMask = 0.0;
    vec3 viaLit = vec3(0.0);

    // ——— slow scanning highlight (screen space) ———
    float sq = (uv.x * 0.25 + 0.5 - fract(iTime * 0.06)) * 4.5;
    float band = exp(-sq * sq);

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 nb = cell + vec2(float(i), float(j));
            vec2 Q = nodePos(nb);

            // ---- via / pad bead at every lattice node ----
            float dv = length(p - Q);
            float disc = 1.0 - smoothstep(0.095, 0.095 + aa * 2.0, dv);
            if (disc > viaMask) {
                viaMask = disc;
                drillMask = 1.0 - smoothstep(0.042, 0.042 + aa * 2.0, dv);
                vec2 nrm = normalize(p - Q + vec2(0.0001));
                float lit = clamp(dot(nrm, normalize(vec2(-0.55, 0.83))), 0.0, 1.0);
                viaLit = mix(vec3(0.42, 0.24, 0.05), vec3(1.00, 0.78, 0.34), lit);
            }
            glow += vec3(1.0, 0.72, 0.30) * 0.30 * exp(-dv * 12.0);

            // ---- copper routes to the 8 neighbours ----
            if (i == 0 && j == 0) continue;

            vec2 hp = pairHash(cell, nb);
            float prob = (i == 0 || j == 0) ? 0.62 : 0.26;
            if (hp.x > prob) continue;

            // canonical endpoint order → identical segment from both sides
            vec2 A = P;
            vec2 B = Q;
            if (cell.x + cell.y * 31.0 > nb.x + nb.y * 31.0) {
                A = Q;
                B = P;
            }

            vec2 rr = route(p, A, B);
            float d = rr.x;
            float s = rr.y;

            float line = 1.0 - smoothstep(w - aa, w + aa, d);
            float flick = 0.86 + 0.14 * sin(iTime * 2.7 + hp.y * 61.0);

            // three copper classes: cyan net, magenta net, amber net
            vec3 lc = vec3(0.14, 0.94, 1.00);
            if (hp.y > 0.62) lc = vec3(1.00, 0.32, 0.86);
            if (hp.y > 0.88) lc = vec3(1.00, 0.72, 0.26);

            copperRGB += lc * line * flick * (1.0 + band * 1.6);
            copperA += line;
            glow += lc * 0.13 * exp(-d * 10.0) * flick * (1.0 + band);

            // ---- travelling data signals ----
            float seed = fract(hp.x * 43.7 + hp.y * 17.1);
            float d1 = s - fract(iTime * 0.24 + seed * 3.1);
            float d2 = s - fract(iTime * 0.10 + seed * 1.7 + 0.5);
            float pulse = 0.95 * exp(-d1 * d1 * 300.0)
                        + 0.45 * exp(-abs(d1) * 20.0)
                        + 0.75 * exp(-d2 * d2 * 300.0);

            vec3 pc = lc * 1.35 + vec3(0.55);
            pulseRGB += pc * pulse * line * 1.15;
            glow += pc * pulse * 0.16;
        }
    }

    // ——— silkscreen: sparse component footprints ———
    vec2 sc = (p + 0.25) * 2.0;
    vec2 sic = floor(sc);
    vec2 sf = fract(sc) - 0.5;
    float silk = 0.0;
    if (hash21(sic + 41.3) > 0.84) {
        vec2 hs = vec2(0.100, 0.055);
        if (hash21(sic + 7.7) > 0.5) hs = vec2(0.055, 0.100);
        vec2 go = abs(sf) - hs;
        vec2 gi = abs(sf) - hs * 0.58;
        float outer = 1.0 - smoothstep(0.0, aa * 2.0, max(go.x, go.y));
        float inner = 1.0 - smoothstep(0.0, aa * 2.0, max(gi.x, gi.y));
        silk = clamp(outer - inner, 0.0, 1.0);
    }

    // ——— composite ———
    vec3 col = vec3(0.016, 0.036, 0.040);                       // soldermask
    col += vec3(0.020, 0.055, 0.062) * exp(-length(uv * vec2(0.65, 1.0)) * 1.5);
    col += vec3(0.030, 0.075, 0.085) * band * 0.35;             // scan veil

    col += glow;                                                 // bloom
    col = mix(col, (copperRGB / max(copperA, 0.001)) * 1.70,     // copper
              clamp(copperA, 0.0, 1.0));
    col += pulseRGB;                                             // signals
    col = mix(col, vec3(0.62, 0.72, 0.70), silk * 0.55);         // silkscreen
    col = mix(col, viaLit * 1.50, viaMask);                      // gold vias
    col = mix(col, vec3(0.004, 0.008, 0.010), drillMask);        // drill holes

    col *= 1.0 - 0.55 * smoothstep(0.7, 1.9, length(uv));        // vignette
    col = col / (1.0 + col);                                     // filmic rolloff
    col = pow(col, vec3(0.85));                                  // gamma lift

    gl_FragColor = vec4(col, 1.0);
}
