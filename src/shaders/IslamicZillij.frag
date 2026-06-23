// Islamic Geometric Pattern — interlocking star-and-polygon rosette
// Technique: radial folds map UV into a single 36° wedge, then alternating
// distance-to-edge checks for the 10-pointed star and its convex fill create
// the classic interlaced zillij look. Cross-hatched "weave" shading on the
// over/under bands plus a warm sand→teal→gold palette complete the tile.

uniform float iTime;
uniform vec3 iResolution;

// Rotational fold: mirror x across successive axes at 2π/N intervals
vec2 pfold(vec2 p, float n) {
    float a = 6.2831853 / n;
    float h = a * 0.5;
    float c = floor(atan(p.y, p.x) / a + 0.5);
    float r = atan(p.y, p.x) - c * a;
    return vec2(cos(r), abs(sin(r))) * length(p);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;

    // slow breathing scale
    float sc = 1.6 + 0.08 * sin(iTime * 0.25);
    uv *= sc;

    // fold into one wedge of a 10-fold rosette
    vec2 p = pfold(uv, 10.0);

    float ang = 0.62831853; // π/5

    // 10-pointed star edge: line from (0,0)→(1, tan(π/5))
    float a1 = abs(p.x * sin(ang) - p.y * cos(ang));

    // convex polygon fill: the isosceles triangle between stars
    float side = sin(ang);
    float a2 = max(p.y * side - p.x * cos(ang),  // hypotenuse of wedge
                   -(p.y * side + p.x * cos(ang))); // mirrored hypotenuse
    float a2b = max(a2, p.y); // clip bottom

    // 10-pointed star (zillij)
    float star = a1 - 0.50;
    // convex kite/lozenge between stars
    float kite = a2b - 0.55;

    // spacing for interlace interlocking band effect
    float bw = 0.045; // band half-width

    // determine over/under weave by checking diagonal parity
    float letter_q = floor(uv.x * 2.0 + 100.5) + floor(uv.y * 2.0 + 100.5);

    // star band with cross-hatch line direction
    float stB = abs(star) - bw;
    float stLine = stB * (mod(letter_q, 2.0) < 0.5 ? 1.0 : -1.0);

    // kite band
    float ktB = abs(kite) - bw;
    float ktLine = ktB * (mod(letter_q, 2.0) < 0.5 ? -1.0 : 1.0);

    // merge both bands — negative inside = on a band
    float band = min(stB, ktB);

    // --- coloring ---
    float t = iTime * 0.18;

    // warm palette for background tile
    vec3 sandGold = vec3(0.96, 0.87, 0.70);
    vec3 deepTeal = vec3(0.04, 0.22, 0.28);
    vec3 ivory    = vec3(0.98, 0.95, 0.88);

    // distance from center modulated
    float r = length(uv) * 0.35;

    // background: warm gradient with subtle radial shift
    vec3 col = mix(sandGold, deepTeal, 0.35 + 0.25 * sin(r + t));

    // tile interior colour when NOT on a band
    float inside = smoothstep(0.005, -0.005, max(star, kite));
    vec3 tile = mix(vec3(0.12, 0.38, 0.42), vec3(0.78, 0.62, 0.28),
                    0.5 + 0.5 * sin(r * 4.0 + t * 1.2));
    col = mix(col, tile, inside * 0.92);

    // raised band (interlace)
    float bMask = smoothstep(0.006, -0.006, band);
    vec3 bandCol = mix(ivory, vec3(0.82, 0.72, 0.52),
                       0.4 + 0.2 * sin(r * 5.0 - t));
    col = mix(col, bandCol, bMask);

    // over/under shading: the "over" side is brighter, "under" darker
    float weaveMask = smoothstep(0.006, -0.006, stB);
    float weaveSign = (mod(letter_q, 2.0) < 0.5) ? 1.0 : -1.0;
    float weave = 0.12 * weaveSign;
    // apply subtle shadow/highlight on cross-overs
    col += bMask * weave * 0.35;

    // accent: thin bright line along band centre
    float centre = smoothstep(0.015, 0.003, abs(star)) +
                   smoothstep(0.015, 0.003, abs(kite));
    centre = min(centre, 1.0);
    col += centre * 0.06 * vec3(1.0, 0.9, 0.7);

    // subtle vignette
    float vig = 1.0 - 0.35 * dot(uv, uv);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
