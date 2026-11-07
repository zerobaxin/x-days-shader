import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ShaderCard } from './ShaderCard';
import { ErrorBoundary } from './ErrorBoundary';
import { ShaderInfo } from '../data/shaders';
import { loadShader } from '../lib/shaders';

const PAGE_SIZE = 18;

interface VirtualizedShaderGridProps {
  shaders: ShaderInfo[];
  searchTerm: string;
  selectedTag: string | null;
}

interface ShaderSourceCache {
  [key: string]: {
    source: string;
    loading: boolean;
    error: boolean;
  };
}

export const VirtualizedShaderGrid: React.FC<VirtualizedShaderGridProps> = ({
  shaders,
  searchTerm,
  selectedTag
}) => {
  const [shaderSources, setShaderSources] = useState<ShaderSourceCache>({});
  const [visibleShaders, setVisibleShaders] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter shaders based on search and tags
  const filteredShaders = useMemo(() => {
    return shaders.filter(shader => {
      const matchesSearch = shader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shader.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !selectedTag || shader.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [shaders, searchTerm, selectedTag]);

  // Only mount a page of cards at a time; more are appended as the
  // sentinel below approaches the viewport (see its observer effect).
  const displayedShaders = useMemo(() => {
    return filteredShaders.slice(0, displayCount);
  }, [filteredShaders, displayCount]);

  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchTerm, selectedTag]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const pager = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDisplayCount((count) =>
            Math.min(count + PAGE_SIZE, filteredShaders.length)
          );
        }
      },
      { rootMargin: '600px' }
    );
    pager.observe(sentinel);
    return () => pager.disconnect();
  }, [filteredShaders.length]);

  // Load shader source on demand
  const loadShaderSource = useCallback(async (shaderId: string, fragmentShader: string) => {
    if (shaderSources[shaderId]?.source || shaderSources[shaderId]?.loading) {
      return;
    }

    // Mark as loading
    setShaderSources(prev => ({
      ...prev,
      [shaderId]: { source: '', loading: true, error: false }
    }));

    try {
      const source = await loadShader(fragmentShader);
      setShaderSources(prev => ({
        ...prev,
        [shaderId]: { source, loading: false, error: false }
      }));
    } catch (error) {
      console.error(`Failed to load shader ${fragmentShader}:`, error);
      setShaderSources(prev => ({
        ...prev,
        [shaderId]: {
          source: `
            uniform float iTime;
            uniform vec3 iResolution;
            uniform vec4 iMouse;
            
            void main() {
              vec2 uv = gl_FragCoord.xy / iResolution.xy;
              vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
              gl_FragColor = vec4(col, 1.0);
            }
          `,
          loading: false,
          error: true
        }
      }));
    }
  }, [shaderSources]);

  // Use Intersection Observer to load shaders as they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const shaderId = entry.target.getAttribute('data-shader-id');
          const fragmentShader = entry.target.getAttribute('data-fragment-shader');

          if (entry.isIntersecting) {
            if (shaderId && fragmentShader) {
              loadShaderSource(shaderId, fragmentShader);
            }
            // Mark as visible
            setVisibleShaders(prev => new Set([...prev, shaderId || '']));
          } else {
            // Mark as not visible
            setVisibleShaders(prev => {
              const newSet = new Set(prev);
              newSet.delete(shaderId || '');
              return newSet;
            });
          }
        });
      },
      { rootMargin: '200px' }
    );

    // Observe all shader cards
    const cards = containerRef.current?.querySelectorAll('[data-shader-id]');
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [displayedShaders, loadShaderSource]);

  // Render shader card with intersection observer
  const renderShaderCard = useCallback((shader: ShaderInfo) => {
    const shaderData = shaderSources[shader.id];
    const isVisible = visibleShaders.has(shader.id);

    return (
      <div
        key={shader.id}
        data-shader-id={shader.id}
        data-fragment-shader={shader.fragmentShader}
        className="w-full"
      >
        {shaderData?.loading ? (
          <div className="aspect-video bg-muted animate-pulse rounded-lg" />
        ) : shaderData?.source ? (
          <ErrorBoundary>
            <ShaderCard
              shader={shader}
              fragmentShaderSource={shaderData.source}
              isActive={isVisible}
            />
          </ErrorBoundary>
        ) : (
          <div className="aspect-video bg-muted animate-pulse rounded-lg" />
        )}
      </div>
    );
  }, [shaderSources, visibleShaders]);



  if (filteredShaders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No shaders found matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedShaders.map(renderShaderCard)}
      </div>
      {displayCount < filteredShaders.length && (
        <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      )}
    </>
  );
}; 
