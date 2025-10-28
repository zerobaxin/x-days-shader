# Video Rendering Size Control Guide

You can now control various aspects of the video rendering size in your shader canvas!

## 🎯 Available Options

### 1. **Canvas Resolution** (`width` & `height`)

Controls the actual WebGL rendering resolution (pixel count).

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  width={1920} // Canvas width in pixels
  height={1080} // Canvas height in pixels
/>
```

**Effect**:

- Higher values = Better quality, slower performance
- Lower values = Lower quality, better performance
- If not set, automatically matches CSS display size

**Example Use Cases**:

- `width={640}, height={360}` - Low quality for smooth performance
- `width={1920}, height={1080}` - Full HD rendering
- `width={3840}, height={2160}` - 4K rendering (very demanding!)

---

### 2. **Pixel Ratio** (`pixelRatio`)

Controls the rendering density (pixels per screen pixel).

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  pixelRatio={1} // 1 = standard, 2 = retina
/>
```

**Default**: Auto-detects device pixel ratio, capped at 1.5 for performance

**Effect**:

- `0.5` = Half resolution, very fast
- `1.0` = Standard resolution
- `2.0` = Retina/high-DPI displays
- Higher = sharper but slower

**Example Use Cases**:

- `pixelRatio={0.5}` - Maximum performance on slow devices
- `pixelRatio={1}` - Balanced quality/performance
- `pixelRatio={2}` - Maximum quality on high-DPI screens

---

### 3. **Video Texture Size** (`videoWidth` & `videoHeight`)

Controls the video element's internal resolution (texture quality).

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  videoWidth={640} // Video texture width
  videoHeight={360} // Video texture height
/>
```

**Effect**:

- Downscales video before GPU processing
- Lower values = Better performance
- Higher values = Better video quality in shader

**Example Use Cases**:

- `videoWidth={320}, videoHeight={180}` - Low-res texture for performance
- `videoWidth={1280}, videoHeight={720}` - HD texture quality
- Not set = Uses video's native resolution

---

## 📊 Complete Examples

### Maximum Performance (Low Quality)

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  width={640}
  height={360}
  pixelRatio={0.5}
  videoWidth={320}
  videoHeight={180}
/>
```

- Canvas renders at 640×360
- Pixel ratio 0.5 means actual pixels: 320×180
- Video texture is 320×180
- **Very fast, lower quality**

---

### Balanced Quality/Performance

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  pixelRatio={1}
  videoWidth={1280}
  videoHeight={720}
/>
```

- Canvas auto-sizes to container
- Standard pixel ratio
- HD video texture
- **Good balance**

---

### Maximum Quality (Slower)

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  width={1920}
  height={1080}
  pixelRatio={2}
/>
```

- Full HD canvas resolution
- Retina pixel density
- Native video resolution
- **Best quality, demanding**

---

### Performance Monitor Mode

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  width={800}
  height={600}
  pixelRatio={1}
  videoWidth={640}
  videoHeight={480}
/>
```

- Fixed resolution for consistent FPS testing
- Moderate quality for development
- **Consistent performance**

---

## 🎨 Interactive Size Adjustment

Here's a complete example with runtime controls:

```tsx
import { useState } from 'react'
import { ShaderCanvas } from '@/components/ShaderCanvas'
import videoSrc from '../assets/video/shader_test.mp4'
import shaderCode from '../shaders/8-bitGroove.frag'

export const AdjustableShader = () => {
  const [quality, setQuality] = useState('medium')

  const qualitySettings = {
    low: {
      width: 640,
      height: 360,
      pixelRatio: 0.5,
      videoWidth: 320,
      videoHeight: 180,
    },
    medium: {
      width: 1280,
      height: 720,
      pixelRatio: 1,
      videoWidth: 1280,
      videoHeight: 720,
    },
    high: {
      width: 1920,
      height: 1080,
      pixelRatio: 1.5,
      videoWidth: 1920,
      videoHeight: 1080,
    },
  }

  const settings = qualitySettings[quality]

  return (
    <div>
      <div className='controls'>
        <button onClick={() => setQuality('low')}>Low Quality</button>
        <button onClick={() => setQuality('medium')}>Medium Quality</button>
        <button onClick={() => setQuality('high')}>High Quality</button>
      </div>

      <ShaderCanvas
        fragmentShader={shaderCode}
        videoSrc={videoSrc}
        {...settings}
      />
    </div>
  )
}
```

---

## 💡 Tips & Best Practices

### 1. Performance Optimization

- Start with low settings and increase gradually
- Monitor FPS to find optimal balance
- Lower `pixelRatio` has biggest performance impact

### 2. Quality Optimization

- Video texture quality matters most for detailed effects
- Canvas resolution affects edge sharpness
- Pixel ratio affects overall crispness

### 3. Mobile Devices

```tsx
// Good mobile settings
<ShaderCanvas
  width={window.innerWidth}
  height={window.innerHeight}
  pixelRatio={1}
  videoWidth={640}
  videoHeight={480}
/>
```

### 4. High-End Desktop

```tsx
// Good desktop settings
<ShaderCanvas
  pixelRatio={window.devicePixelRatio}
  videoWidth={1920}
  videoHeight={1080}
/>
```

---

## 🔍 Understanding the Differences

### Canvas Size vs Display Size

- **CSS Size**: How big it looks on screen (set via CSS)
- **Canvas Size**: How many pixels are actually rendered
- They can be different!

Example:

```tsx
// CSS makes it 1000px wide on screen
// But only renders 500px internally (faster)
<div style={{ width: '1000px', height: '600px' }}>
  <ShaderCanvas width={500} height={300} />
</div>
```

### Video Size vs Canvas Size

- **Video Size**: Resolution of texture sampled by shader
- **Canvas Size**: Resolution shader outputs to
- Usually want them similar for best quality

---

## 🚀 Quick Start

### Just want better performance?

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  pixelRatio={0.5} // ← Add this!
/>
```

### Just want better quality?

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  pixelRatio={2} // ← Add this!
/>
```

### Want fixed size?

```tsx
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  width={1280} // ← Add these!
  height={720}
/>
```

---

## 🎯 Your Current Settings

With your DOT_DENSITY at 185.0, you're rendering MANY dots. Consider:

```tsx
// Lower canvas resolution for better performance
<ShaderCanvas
  fragmentShader={shader}
  videoSrc={video}
  width={1280}
  height={720}
  pixelRatio={1}
/>
```

Or adjust DOT_DENSITY in your shader:

```glsl
#define DOT_DENSITY 185.0  // Very detailed, slower
// Try: 50.0, 75.0, 100.0 for better performance
```

---

**Need help?** Check the demo pages for working examples!
