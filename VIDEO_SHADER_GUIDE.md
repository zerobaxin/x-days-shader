# Video Shader Integration Guide

This guide explains how to use MP4 videos as input to your GLSL shaders in this project.

## Quick Start

### 1. Prepare Your Video

Place your MP4 video file in the `public` folder. For example:
```
public/
  └── my-video.mp4
```

### 2. Use the ShaderCanvas Component

The `ShaderCanvas` component now accepts a `videoSrc` prop:

```tsx
import { ShaderCanvas } from './components/ShaderCanvas';
import shaderCode from './shaders/8-bitGroove.frag';

function MyComponent() {
  return (
    <ShaderCanvas
      fragmentShader={shaderCode}
      videoSrc="/my-video.mp4"
    />
  );
}
```

### 3. Access Video in Your Shader

In your fragment shader, access the video texture using `iChannel0`:

```glsl
uniform sampler2D iChannel0;

void main() {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec4 videoColor = texture(iChannel0, uv);
    
    // Apply your effects here
    fragColor = videoColor;
}
```

## Complete Example

Here's a complete example using the `8-bitGroove.frag` shader:

```tsx
import React from 'react';
import { ShaderCanvas } from '../components/ShaderCanvas';
import shaderCode from '../shaders/8-bitGroove.frag';

export const VideoShaderPage: React.FC = () => {
  return (
    <div className="w-full h-screen">
      <ShaderCanvas
        fragmentShader={shaderCode}
        videoSrc="/my-video.mp4"
      />
    </div>
  );
};
```

## Available Uniforms

When using video input, your shader has access to:

- `uniform float iTime` - Current time in seconds
- `uniform vec3 iResolution` - Canvas resolution (width, height, 1.0)
- `uniform vec4 iMouse` - Mouse position (x, y, click, 0)
- `uniform sampler2D iChannel0` - Video texture

## Video Properties

The video is configured with the following properties:
- **Loop**: Automatically loops when finished
- **Muted**: Sound is muted (required for autoplay)
- **PlayInline**: Plays inline on mobile devices
- **CrossOrigin**: Set to 'anonymous' for CORS support

## Tips and Best Practices

### 1. Video Format Recommendations
- Use H.264 codec for best browser compatibility
- Keep resolution reasonable (1080p or lower) for performance
- Use compressed videos to reduce loading time

### 2. Performance Optimization
- The video texture updates automatically each frame
- Consider reducing canvas resolution for complex shaders
- Use `LinearFilter` for smooth video playback

### 3. Multiple Video Inputs
To use multiple videos, modify the `ShaderCanvas` component to accept an array of video sources and create `iChannel1`, `iChannel2`, etc.

### 4. Video Controls
If you need video controls (play/pause, seek), you can create a custom video player component:

```tsx
import React, { useRef, useState } from 'react';
import { ShaderCanvas } from '../components/ShaderCanvas';
import shaderCode from '../shaders/8-bitGroove.frag';

export const VideoShaderWithControls: React.FC = () => {
  const [videoSrc] = useState('/my-video.mp4');

  return (
    <div>
      <ShaderCanvas
        fragmentShader={shaderCode}
        videoSrc={videoSrc}
      />
      {/* Add custom controls here */}
    </div>
  );
};
```

## Troubleshooting

### Video Not Showing
1. Check that the video path is correct
2. Verify the video file is in the `public` folder
3. Check browser console for errors
4. Ensure your shader is using `iChannel0` to sample the texture

### Video Not Playing
1. Videos must be muted for autoplay to work
2. Check browser autoplay policies
3. Verify video codec compatibility (use H.264)

### Performance Issues
1. Reduce video resolution
2. Reduce canvas size
3. Simplify shader complexity
4. Check GPU usage in browser DevTools

## Example Shaders

### Halftone Effect (8-bitGroove.frag)
Creates a dot-matrix halftone effect based on video brightness:

```glsl
uniform sampler2D iChannel0;
uniform vec3 iResolution;

#define DOT_DENSITY 25.0
#define MAX_RADIUS 5.5

float getBrightness(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 scaledUV = uv * DOT_DENSITY;
    vec2 cellID = floor(scaledUV);
    vec2 localUV = fract(scaledUV);
    
    vec2 cellCenterUV = (cellID + 0.5) / DOT_DENSITY;
    vec4 texColor = texture(iChannel0, cellCenterUV);
    
    float brightness = getBrightness(texColor.rgb);
    float dist = distance(localUV, vec2(0.5));
    float radius = brightness * MAX_RADIUS;
    
    float blurWidth = min(radius * 0.5, 0.05);
    float dotValue = smoothstep(radius, radius - blurWidth, dist);

    fragColor = vec4(texColor.rgb * dotValue, 1.0);
}
```

### Simple Pixelation Effect
```glsl
uniform sampler2D iChannel0;
uniform vec3 iResolution;

void main() {
    float pixelSize = 10.0;
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 pixelatedUV = floor(uv * iResolution.xy / pixelSize) * pixelSize / iResolution.xy;
    
    fragColor = texture(iChannel0, pixelatedUV);
}
```

### Color Manipulation
```glsl
uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform float iTime;

void main() {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec4 color = texture(iChannel0, uv);
    
    // Invert colors over time
    float t = sin(iTime) * 0.5 + 0.5;
    color.rgb = mix(color.rgb, 1.0 - color.rgb, t);
    
    fragColor = color;
}
```

## Advanced Usage

### Using with Webcam

Instead of a video file, you can use the webcam:

```tsx
import React, { useEffect, useState } from 'react';
import { ShaderCanvas } from '../components/ShaderCanvas';

export const WebcamShader: React.FC = () => {
  const [streamUrl, setStreamUrl] = useState<string>('');

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        // Create object URL from stream
        const url = URL.createObjectURL(stream);
        setStreamUrl(url);
      })
      .catch(err => console.error('Webcam error:', err));
  }, []);

  if (!streamUrl) return <div>Loading webcam...</div>;

  return <ShaderCanvas videoSrc={streamUrl} fragmentShader={yourShader} />;
};
```

### Using with Video Upload

Allow users to upload their own videos:

```tsx
import React, { useState } from 'react';
import { ShaderCanvas } from '../components/ShaderCanvas';

export const UploadVideoShader: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      {videoUrl && (
        <ShaderCanvas videoSrc={videoUrl} fragmentShader={yourShader} />
      )}
    </div>
  );
};
```

## Next Steps

- Experiment with different shader effects
- Try combining video with time-based effects
- Create interactive controls for shader parameters
- Add support for multiple video channels
- Implement video recording of shader output

For more shader examples, check the `src/shaders/` directory!

