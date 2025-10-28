# Quick Start: Using Video with Your Shader

## 🎬 What's Been Set Up

Your shader canvas now supports MP4 video input! The `8-bitGroove.frag` shader you have open creates a cool halftone dot effect on video.

## ⚡ Quick Usage (3 Steps)

### Step 1: Add Your Video
Place your MP4 file in the `public` folder:
```
public/
  └── your-video.mp4
```

### Step 2: View the Demo
Start your dev server and navigate to:
```
http://localhost:5173/video-demo
```

### Step 3: Update the Path
Edit `src/pages/VideoShaderDemo.tsx` and change line 51:
```tsx
videoSrc="/your-video.mp4"
```

## 🎨 Using Any Shader with Video

```tsx
import { ShaderCanvas } from '@/components/ShaderCanvas';
import myShader from './shaders/8-bitGroove.frag';

function MyComponent() {
  return (
    <ShaderCanvas
      fragmentShader={myShader}
      videoSrc="/my-video.mp4"
    />
  );
}
```

## 🔧 In Your Shader Code

Access the video texture using `iChannel0`:

```glsl
uniform sampler2D iChannel0;

void main() {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec4 videoColor = texture(iChannel0, uv);
    
    // Your effect here
    fragColor = videoColor;
}
```

## 📝 Example: Your Current Shader

Your `8-bitGroove.frag` already uses this! It:
1. Samples the video at line 20: `texture(iChannel0, cellCenterUV)`
2. Calculates brightness
3. Creates dots based on the brightness
4. Applies a halftone effect to the video

## 🚀 Testing Without a Video File

You can test with a webcam or use an online video URL:

```tsx
// Option 1: Online video (CORS-enabled)
videoSrc="https://example.com/video.mp4"

// Option 2: Test with a static image first
videoSrc="/placeholder.svg"
```

## 💡 Tips

- Use H.264 codec for best compatibility
- Keep videos under 1080p for smooth performance  
- Videos automatically loop and are muted
- The texture updates every frame automatically

## 🐛 Troubleshooting

**Video not showing?**
- Check the path in `videoSrc`
- Verify the file is in `public/`
- Open browser console for errors

**Performance issues?**
- Try a lower resolution video
- Reduce shader complexity
- Check the `DOT_DENSITY` value (lower = better performance)

## 📚 More Info

See `VIDEO_SHADER_GUIDE.md` for advanced usage, webcam support, file uploads, and more examples!

---

**Ready to test?** Just add a video to `public/` and visit `/video-demo`! 🎉

