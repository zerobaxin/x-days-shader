uniform float iTime;
uniform vec3 iResolution;
uniform sampler2D iChannel0;

#define DOT_DENSITY 50.0
#define MAX_RADIUS 2.5

float getBrightness(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main()
{
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 scaledUV = uv * DOT_DENSITY;
    vec2 cellID = floor(scaledUV);
    vec2 localUV = fract(scaledUV);
    
    
    vec2 cellCenterUV = (cellID + 0.5) / DOT_DENSITY;
    vec4 texColor = texture2D(iChannel0, cellCenterUV);
    
    float brightness = getBrightness(texColor.rgb);
    float dist = distance(localUV, vec2(0.5));
    float radius = brightness * MAX_RADIUS;
    
    float blurWidth = min(radius * 0.5, 0.05);
    float dotValue = smoothstep(radius, radius - blurWidth, dist);

    gl_FragColor = vec4(texColor.rgb * dotValue, 1.0);
}
