uniform float iTime;
uniform vec3 iResolution;

// Optimized random function with better distribution
float random(in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Noise pattern function
float pattern(vec2 st) {
    return random(floor(st));
}


vec2 get_point_position(float i, float t) {
    // Pre-calculated constants for division -> multiplication
    const float D_235 = 1.0 / 235.0;
    const float D_11 = 1.0 / 11.0;
    const float D_14 = 1.0 / 14.0;
    const float D_8 = 1.0 / 8.0;
    const float D_9 = 1.0 / 9.0;
    const float D_49 = 1.0 / 49.0;
    const float D_17 = 1.0 / 17.0;

    float x = i;
    float y = i * D_235;

    // Optimize trigonometric calculations
    float x_d11_t8 = x * D_11 + t * 8.0;
    float x_d14 = x * D_14;
    float y_d9_t2 = y * D_9 + t * 2.0;
    float y_d17 = y * D_17;
    
    float sin_x_d11_t8 = sin(x_d11_t8);
    float cos_x_d14 = cos(x_d14);
    float sin_y_d9_t2 = sin(y_d9_t2);
    float sin_y_d17 = sin(y_d17);
    
    float k = (4.0 + sin_x_d11_t8) * cos_x_d14;
    float e = y * D_8 - 19.0;
    float d = length(vec2(k, e)) + sin_y_d9_t2;
    float c = d * d * D_49 - t;
    
    // Optimize final calculations
    float k_2 = k * 2.0;
    float sin_k_2 = sin(k_2);
    float y_minus_d_3 = y - d * 3.0;
    float sin_y_minus_d_3 = sin(y_minus_d_3);
    
    float q = 2.0 * sin_k_2 + sin_y_d17 * k * (9.0 + 2.0 * sin_y_minus_d_3);
    
    float cos_c = cos(c);
    float sin_c = sin(c);
    
    float px = q + 50.0 * cos_c + 200.0;
    float py = q * sin_c + d * 39.0 - 440.0;
    
    return vec2(px, py);
}

// Main shader function - creates animated particle field with noise-based coloring
void main()
{
    // Constants
    const vec2 canvas_size = vec2(400.0, 400.0);
    const float time_scale = 0.8;
    const float noise_scale = 75.0;
    const float point_radius_mult = 1.5;
    const float base_intensity = 96.0 / 255.0;
    const float epsilon = 1e-5;
    
    // Pre-calculate values outside loop
    vec2 scale = iResolution.xy / canvas_size;
    float t = iTime * time_scale;
    vec2 st = gl_FragCoord.xy / iResolution.xy;
    st *= noise_scale;
    st += t;
    float noise_val = pattern(st);
    float inv_noise = 1.0 / (noise_val + epsilon);
    float point_radius = point_radius_mult * min(scale.x, scale.y);
    
    // Initialize color with noise base
    vec3 color = vec3(0.0) - vec3(noise_val);
    
    // Optimized loop with reduced iterations and early exit
    for (float i = 9999.0; i >= 0.0; i -= 4.0) {
        vec2 p = get_point_position(i, t);
        p.y = canvas_size.y - p.y;
        p *= scale;
        
        // Early exit if point is too far away
        vec2 diff = gl_FragCoord.xy - p;
        float dist_sq = dot(diff, diff);
        if (dist_sq > point_radius * point_radius * 4.0) continue;
        
        float dist = sqrt(dist_sq);
        float intensity = base_intensity * smoothstep(point_radius, 0.0, dist);
        color += intensity * inv_noise;
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
