import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { vertexShader } from '../lib/shaders';

interface ShaderCanvasProps {
  className?: string;
  fragmentShader?: string;
  videoSrc?: string;
  pixelRatio?: number; // Custom pixel ratio (default: auto-detect, max 1.5)
  width?: number; // Fixed width in pixels (default: auto)
  height?: number; // Fixed height in pixels (default: auto)
  videoWidth?: number; // Video element width (affects texture quality)
  videoHeight?: number; // Video element height (affects texture quality)
}

export const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  className = '',
  fragmentShader: fragmentShaderProp,
  videoSrc,
  pixelRatio,
  width,
  height,
  videoWidth,
  videoHeight
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const [defaultFragmentShader, setDefaultFragmentShader] = useState<string>('');
  const mouseRef = useRef<THREE.Vector4>(new THREE.Vector4(0, 0, 0, 0));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);

  // Load default shader if none provided
  // useEffect(() => {
  //   if (!fragmentShaderProp) {
  //     import('../shaders/plasma.frag').then(module => {
  //       setDefaultFragmentShader(module.default);
  //     });
  //   }
  // }, [fragmentShaderProp]);

  useEffect(() => {
    const fragmentShader = fragmentShaderProp || defaultFragmentShader;
    if (!canvasRef.current || !fragmentShader) return;

    // Initialize Three.js
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Disable antialiasing for better performance
      alpha: false,
      powerPreference: "high-performance" // Request high-performance GPU
    });

    // Set pixel ratio (custom or auto-detect with max 1.5)
    const effectivePixelRatio = pixelRatio ?? Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(effectivePixelRatio);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create fullscreen quad geometry
    const geometry = new THREE.PlaneGeometry(2, 2);

    // Create video texture if video source is provided
    let videoTexture: THREE.VideoTexture | null = null;
    if (videoSrc) {
      const video = document.createElement('video');
      video.src = videoSrc;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      // Set custom video dimensions if provided
      if (videoWidth) video.width = videoWidth;
      if (videoHeight) video.height = videoHeight;

      // Play video
      video.play().catch((error) => {
        console.error('Error playing video:', error);
      });

      videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBAFormat;

      videoRef.current = video;
      videoTextureRef.current = videoTexture;
    }

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        iMouse: { value: mouseRef.current },
        iChannel0: { value: videoTexture }
      },
      vertexShader,
      fragmentShader
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Store references
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    materialRef.current = material;

    // Handle resize
    const handleResize = () => {
      if (!renderer || !material) return;

      // Use custom dimensions if provided, otherwise use canvas bounding rect
      let canvasWidth: number;
      let canvasHeight: number;

      if (width && height) {
        canvasWidth = width;
        canvasHeight = height;
      } else {
        const rect = canvas.getBoundingClientRect();
        canvasWidth = rect.width;
        canvasHeight = rect.height;
      }

      renderer.setSize(canvasWidth, canvasHeight, false);
      material.uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
    };

    // Initial resize
    handleResize();

    // Mouse event handlers
    const handleMouseMove = (event: MouseEvent) => {
      if (!material) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update mouse position (x, y, 0, 0)
      mouseRef.current.set(x, y, 0, 0);
      material.uniforms.iMouse.value = mouseRef.current;
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!material) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update mouse position with click (x, y, 1, 0) - third component indicates click
      mouseRef.current.set(x, y, 1, 0);
      material.uniforms.iMouse.value = mouseRef.current;
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!material) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update mouse position without click (x, y, 0, 0)
      mouseRef.current.set(x, y, 0, 0);
      material.uniforms.iMouse.value = mouseRef.current;
    };

    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Animation loop
    const animate = () => {
      if (!renderer || !scene || !camera || !material) return;

      const time = clockRef.current.getElapsedTime();
      material.uniforms.iTime.value = time;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Set up resize observer (only if not using fixed dimensions)
    let resizeObserver: ResizeObserver | null = null;
    if (!width || !height) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas);
    }

    // Cleanup
    return () => {
      resizeObserver?.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);

      // Clean up video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current = null;
      }
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
        videoTextureRef.current = null;
      }

      renderer?.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [fragmentShaderProp, defaultFragmentShader, videoSrc, pixelRatio, width, height, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
    />
  );
};
