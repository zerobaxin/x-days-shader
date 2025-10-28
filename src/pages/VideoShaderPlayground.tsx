import React, { useState, useRef } from 'react';
import { ShaderCanvas } from '@/components/ShaderCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Play, Pause, Video } from 'lucide-react';

interface ShaderOption {
  id: string;
  name: string;
  description: string;
  code: string;
}

const shaderOptions: ShaderOption[] = [
  {
    id: 'halftone',
    name: '8-bit Groove (Halftone)',
    description: 'Creates a retro dot-matrix halftone effect based on video brightness',
    code: `uniform float iTime;
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
}`
  },
  {
    id: 'pixelate',
    name: 'Pixelation',
    description: 'Retro pixelation effect',
    code: `uniform vec3 iResolution;
uniform sampler2D iChannel0;

void main() {
    float pixelSize = 10.0;
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 pixelatedUV = floor(uv * iResolution.xy / pixelSize) * pixelSize / iResolution.xy;
    
    gl_FragColor = texture2D(iChannel0, pixelatedUV);
}`
  },
  {
    id: 'rgb-split',
    name: 'RGB Split',
    description: 'Chromatic aberration effect',
    code: `uniform vec3 iResolution;
uniform sampler2D iChannel0;
uniform float iTime;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float amount = 0.01 * sin(iTime);
    
    float r = texture2D(iChannel0, uv + vec2(amount, 0.0)).r;
    float g = texture2D(iChannel0, uv).g;
    float b = texture2D(iChannel0, uv - vec2(amount, 0.0)).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
}`
  },
  {
    id: 'edge-detect',
    name: 'Edge Detection',
    description: 'Sobel edge detection filter',
    code: `uniform vec3 iResolution;
uniform sampler2D iChannel0;

float getBrightness(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 texelSize = 1.0 / iResolution.xy;
    
    float tl = getBrightness(texture2D(iChannel0, uv + vec2(-texelSize.x, texelSize.y)).rgb);
    float tm = getBrightness(texture2D(iChannel0, uv + vec2(0.0, texelSize.y)).rgb);
    float tr = getBrightness(texture2D(iChannel0, uv + vec2(texelSize.x, texelSize.y)).rgb);
    float ml = getBrightness(texture2D(iChannel0, uv + vec2(-texelSize.x, 0.0)).rgb);
    float mr = getBrightness(texture2D(iChannel0, uv + vec2(texelSize.x, 0.0)).rgb);
    float bl = getBrightness(texture2D(iChannel0, uv + vec2(-texelSize.x, -texelSize.y)).rgb);
    float bm = getBrightness(texture2D(iChannel0, uv + vec2(0.0, -texelSize.y)).rgb);
    float br = getBrightness(texture2D(iChannel0, uv + vec2(texelSize.x, -texelSize.y)).rgb);
    
    float gx = -tl + tr - 2.0*ml + 2.0*mr - bl + br;
    float gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
    
    float edge = length(vec2(gx, gy));
    gl_FragColor = vec4(vec3(edge), 1.0);
}`
  },
  {
    id: 'kaleidoscope',
    name: 'Kaleidoscope',
    description: 'Kaleidoscopic mirror effect',
    code: `uniform vec3 iResolution;
uniform sampler2D iChannel0;
uniform float iTime;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float segments = 8.0;
    angle = mod(angle, 3.14159 * 2.0 / segments);
    angle = abs(angle - 3.14159 / segments);
    
    vec2 newUV = vec2(cos(angle), sin(angle)) * radius;
    newUV = newUV * 0.5 + 0.5;
    
    gl_FragColor = texture2D(iChannel0, newUV);
}`
  }
];

export const VideoShaderPlayground: React.FC = () => {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [selectedShader, setSelectedShader] = useState<ShaderOption>(shaderOptions[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Video Shader Playground
          </h1>
          <p className="text-gray-300 text-lg">
            Apply real-time GLSL shader effects to your videos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Canvas Area */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  {videoSrc ? (
                    <ShaderCanvas
                      fragmentShader={selectedShader.code}
                      videoSrc={videoSrc}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Upload a video to get started</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <Button
                  onClick={handleUploadClick}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {videoSrc ? 'Change Video' : 'Upload Video'}
                </Button>
                <label htmlFor="video-upload" className="sr-only">
                  Upload video file
                </label>
                <input
                  id="video-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  aria-label="Upload video file"
                />
              </CardContent>
            </Card>

            {/* Current Shader Info */}
            <Card className="bg-gray-800 border-gray-700 mt-4">
              <CardHeader>
                <CardTitle className="text-white">Current Shader: {selectedShader.name}</CardTitle>
                <CardDescription>{selectedShader.description}</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Shader Selection Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Shader Effects</CardTitle>
                <CardDescription>Choose a shader effect to apply</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {shaderOptions.map((shader) => (
                  <Button
                    key={shader.id}
                    onClick={() => setSelectedShader(shader)}
                    variant={selectedShader.id === shader.id ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-3"
                  >
                    <div>
                      <div className="font-semibold">{shader.name}</div>
                      <div className="text-xs opacity-70">{shader.description}</div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-gray-800 border-gray-700 mt-4">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-300 space-y-2">
                <p>• Upload any MP4 video file</p>
                <p>• Click on different shader effects</p>
                <p>• Videos loop automatically</p>
                <p>• Works best with 1080p or lower</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

