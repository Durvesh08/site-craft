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
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [loadedCount, setLoadedCount] = useState(0);

  // Calculate total frames
  const totalFrames = useMemo(() => {
    return cinematicTimeline.reduce((acc, scene) => acc + scene.frameCount, 0);
  }, []);

  // Preload frames progressively
  useEffect(() => {
    let isCancelled = false;
    let loaded = 0;
    const imgCache: Record<string, HTMLImageElement> = {};

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
              imgCache[src] = img;
              loaded++;
              setLoadedCount(loaded);
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load image: ${src}`);
              resolve(); // Resolve anyway to continue
            };
          });
        }
      }
      if (!isCancelled) {
        setImages(imgCache);
      }
    };

    loadImages();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Map scroll progress to the exact frame to render
  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Find which scene we're in
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

      // If past the last scene
      if (latest > cinematicTimeline[cinematicTimeline.length - 1].scrollRange[1]) {
        currentScene = cinematicTimeline[cinematicTimeline.length - 1];
        sceneProgress = 1;
      }

      // Calculate exact frame index (1-indexed)
      let frameIndex = Math.floor(sceneProgress * currentScene.frameCount) + 1;
      if (frameIndex > currentScene.frameCount) frameIndex = currentScene.frameCount;

      const indexStr = frameIndex.toString().padStart(currentScene.padLength, '0');
      const src = `${currentScene.pathPrefix}${indexStr}.${currentScene.extension}`;

      const img = images[src];
      
      // Handle canvas rendering with aspect ratio preservation (cover)
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
      } else {
        // Fallback or loading state
        // Might want to draw the last available image or just clear if nothing
      }
    });
  }, [scrollYProgress, images]);

  // Handle resize rendering explicitly to not lose image on resize
  useEffect(() => {
    const handleResize = () => {
      // Trigger a re-render of the current frame on resize by slightly nudging the progress trigger or re-applying
      // We can just rely on Lenis continuous raf for this, but a manual redraw helps if perfectly stationary.
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
