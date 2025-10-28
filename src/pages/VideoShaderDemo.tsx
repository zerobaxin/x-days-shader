import React, { useState } from 'react';
import { ShaderCanvas } from '../components/ShaderCanvas';
import { Button } from '../components/ui/button';
import videoSrc from '../assets/video/shader_test.mp4';

const fragmentShader = `
uniform float iTime;
uniform vec3 iResolution;
uniform sampler2D iChannel0;

#define DOT_DENSITY 25.0
#define MAX_RADIUS 5.5

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
`;

type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export const VideoShaderDemo: React.FC = () => {
  const [quality, setQuality] = useState<QualityPreset>('medium');

  const qualitySettings = {
    low: {
      width: 640,
      height: 360,
      pixelRatio: 0.5,
      videoWidth: 320,
      videoHeight: 180
    },
    medium: {
      width: 1280,
      height: 720,
      pixelRatio: 1,
      videoWidth: 640,
      videoHeight: 360
    },
    high: {
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      videoWidth: 1280,
      videoHeight: 720
    },
    ultra: {
      width: undefined,
      height: undefined,
      pixelRatio: 2,
      videoWidth: undefined,
      videoHeight: undefined
    },
  };

  const settings = qualitySettings[quality];

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Video Shader Demo</h1>
        <p className="text-gray-300 mb-4">
          This shader applies a halftone dot effect to your video in real-time.
        </p>

        {/* Quality Controls */}
        <div className="mb-4 flex gap-2 items-center">
          <span className="text-white font-semibold">Rendering Quality:</span>
          <Button
            onClick={() => setQuality('low')}
            variant={quality === 'low' ? 'default' : 'outline'}
            size="sm"
          >
            Low (Fast)
          </Button>
          <Button
            onClick={() => setQuality('medium')}
            variant={quality === 'medium' ? 'default' : 'outline'}
            size="sm"
          >
            Medium
          </Button>
          <Button
            onClick={() => setQuality('high')}
            variant={quality === 'high' ? 'default' : 'outline'}
            size="sm"
          >
            High
          </Button>
          <Button
            onClick={() => setQuality('ultra')}
            variant={quality === 'ultra' ? 'default' : 'outline'}
            size="sm"
          >
            Ultra (Slow)
          </Button>
        </div>

        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <ShaderCanvas
            fragmentShader={fragmentShader}
            videoSrc={videoSrc}
            {...settings}
          />
        </div>

        {/* Current Settings Display */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Current Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Canvas:</span>
              <span className="text-white ml-2">
                {settings.width || 'Auto'} × {settings.height || 'Auto'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Pixel Ratio:</span>
              <span className="text-white ml-2">{settings.pixelRatio || '1.5'}</span>
            </div>
            <div>
              <span className="text-gray-400">Video Texture:</span>
              <span className="text-white ml-2">
                {settings.videoWidth || 'Native'} × {settings.videoHeight || 'Native'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Dot Density:</span>
              <span className="text-white ml-2">185</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold text-white mb-4">Rendering Size Controls</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Canvas Resolution</h3>
              <p>Controls how many pixels are actually rendered. Higher = better quality but slower.</p>
              <ul className="list-disc list-inside mt-1 ml-4 text-sm">
                <li><strong>Low:</strong> 640×360 - Maximum performance</li>
                <li><strong>Medium:</strong> 1280×720 - Balanced</li>
                <li><strong>High:</strong> 1920×1080 - Best quality</li>
                <li><strong>Ultra:</strong> Auto-size - Adapts to display</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Pixel Ratio</h3>
              <p>Controls rendering density. Higher = sharper but more demanding.</p>
              <ul className="list-disc list-inside mt-1 ml-4 text-sm">
                <li><strong>0.5:</strong> Half resolution (low mode)</li>
                <li><strong>1.0:</strong> Standard resolution</li>
                <li><strong>2.0:</strong> Retina/high-DPI (ultra mode)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Video Texture Size</h3>
              <p>Controls the video resolution before processing. Lower = better performance.</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded">
            <p className="text-sm text-gray-300">
              <strong>💡 Tip:</strong> Try different quality settings to find the best balance for your device!<br />
              See <code className="text-xs bg-gray-600 px-2 py-1 rounded">VIDEO_RENDERING_SIZE_GUIDE.md</code> for more details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

