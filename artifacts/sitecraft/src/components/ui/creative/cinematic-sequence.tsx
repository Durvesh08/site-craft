import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useScroll, useTransform, MotionValue } from 'framer-motion';

interface SceneConfig {
  id: string;
  pathPrefix: string;
  frameCount: number;
  padLength: number;
  extension: string;
  scrollRange: [number, number];
  resolution: [number, number];
}

const cinematicTimeline: SceneConfig[] = [
  {
    id: 'scene_1',
    pathPrefix: '/cinematic/scene_1/videoplayback_',
    frameCount: 81,
    padLength: 3, // 001 - 081
    extension: 'jpg',
    scrollRange: [0, 0.33],
    resolution: [3840, 1920],
  },
  {
    id: 'scene_2',
    pathPrefix: '/cinematic/scene_2/videoplayback_',
    frameCount: 91,
    padLength: 3, // 001 - 091
    extension: 'jpg',
    scrollRange: [0.33, 0.66],
    resolution: [3840, 1920],
  },
  {
    id: 'scene_3',
    pathPrefix: '/cinematic/scene_3/frame_',
    frameCount: 25,
    padLength: 3, // 001 - 025
    extension: 'jpg',
    scrollRange: [0.66, 1.0],
    resolution: [1920, 1080],
  },
];

interface CinematicSequenceProps {
  scrollYProgress: MotionValue<number>;
}

export function CinematicSequence({ scrollYProgress }: CinematicSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [loadedCount, setLoadedCount] = useState(0);
  // Keep track of the current requested src so we can draw it as soon as it loads
  const currentSrcRef = useRef<string | null>(null);

  // Calculate total frames
  const totalFrames = useMemo(() => {
    return cinematicTimeline.reduce((acc, scene) => acc + scene.frameCount, 0);
  }, []);

  const drawFrame = (src: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[src];
    if (img && img.complete) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      
      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;  

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img, 
        0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
      );
    }
  };

  // Preload frames progressively but concurrently
  useEffect(() => {
    let isCancelled = false;
    let loaded = 0;

    const loadImages = async () => {
      for (const scene of cinematicTimeline) {
        for (let i = 1; i <= scene.frameCount; i++) {
          if (isCancelled) return;
          const indexStr = i.toString().padStart(scene.padLength, '0');
          const src = `${scene.pathPrefix}${indexStr}.${scene.extension}`;

          await new Promise<void>((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              if (isCancelled) {
                resolve();
                return;
              }
              imagesRef.current[src] = img;
              loaded++;
              
              // Only update state occasionally to avoid thrashing
              if (loaded % 10 === 0 || loaded === 1 || loaded === totalFrames) {
                setLoadedCount(loaded);
              }
              
              // Draw immediately if this is the currently requested frame
              if (currentSrcRef.current === src) {
                drawFrame(src);
              }
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load image: ${src}`);
              resolve(); // Resolve anyway so it continues
            };
          });
        }
      }
    };

    loadImages();

    return () => {
      isCancelled = true;
    };
  }, [totalFrames]);

  // Map scroll progress to the exact frame to render
  useEffect(() => {
    // Initial draw if scroll is 0
    let currentScene = cinematicTimeline[0];
    let src = `${currentScene.pathPrefix}${'1'.padStart(currentScene.padLength, '0')}.${currentScene.extension}`;
    currentSrcRef.current = src;
    drawFrame(src);

    return scrollYProgress.onChange((latest) => {
      let currentScene = cinematicTimeline[0];
      let sceneProgress = 0;

      for (const scene of cinematicTimeline) {
        if (latest >= scene.scrollRange[0] && latest <= scene.scrollRange[1]) {
          currentScene = scene;
          const range = scene.scrollRange[1] - scene.scrollRange[0];
          sceneProgress = (latest - scene.scrollRange[0]) / range;
          break;
        }
      }

      if (latest > cinematicTimeline[cinematicTimeline.length - 1].scrollRange[1]) {
        currentScene = cinematicTimeline[cinematicTimeline.length - 1];
        sceneProgress = 1;
      }

      let frameIndex = Math.floor(sceneProgress * currentScene.frameCount) + 1;
      if (frameIndex > currentScene.frameCount) frameIndex = currentScene.frameCount;

      const indexStr = frameIndex.toString().padStart(currentScene.padLength, '0');
      const requestedSrc = `${currentScene.pathPrefix}${indexStr}.${currentScene.extension}`;

      currentSrcRef.current = requestedSrc;
      drawFrame(requestedSrc);
    });
  }, [scrollYProgress]);

  // Handle resize rendering explicitly to not lose image on resize
  useEffect(() => {
    const handleResize = () => {
      if (currentSrcRef.current) {
        drawFrame(currentSrcRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none w-full h-full overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover block"
      />
      {/* Optional Loading Indicator Layer */}
      {loadedCount < totalFrames && loadedCount > 0 && (
         <div className="absolute bottom-6 right-6 text-[10px] font-mono text-white/40 mix-blend-difference">
           BUFFERING SEQ: {Math.floor((loadedCount / totalFrames) * 100)}%
         </div>
      )}
    </div>
  );
}
