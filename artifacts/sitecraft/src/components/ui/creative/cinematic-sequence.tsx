import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMotionValueEvent, MotionValue } from 'framer-motion';

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
    scrollRange: [0, 0.40], // First 40% of scroll
    resolution: [1920, 1080],
  },
  {
    id: 'scene_2',
    pathPrefix: '/cinematic/scene_2/ezgif-frame-',
    frameCount: 255,
    padLength: 3, // 001 - 255
    extension: 'jpg',
    scrollRange: [0.40, 0.70], // Middle 30% of scroll
    resolution: [1920, 1080],
  },
  {
    id: 'scene_last',
    pathPrefix: '/cinematic/scene_last/frame_',
    frameCount: 70,
    padLength: 3, // 001 - 070
    extension: 'jpg',
    scrollRange: [0.70, 1.0], // Final 30% of scroll (Pricing/Footer)
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
      // Enable high-quality scaling and smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear the canvas using internal logical width/height
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.max(hRatio, vRatio);
      
      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;  

      ctx.drawImage(
        img, 
        0, 0, img.width, img.height,
        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
      );
    } else {
      // Trigger lazy load if not already cached, ensuring smooth fallback
      if (!img) {
        const tempImg = new Image();
        tempImg.src = src;
        tempImg.onload = () => {
          imagesRef.current[src] = tempImg;
          if (currentSrcRef.current === src) {
            drawFrame(src);
          }
        };
      }
    }
  };

  // Preload frames concurrently in fast parallel batches
  useEffect(() => {
    let isCancelled = false;
    let loaded = 0;

    const loadImages = async () => {
      const allSrcs: string[] = [];
      for (const scene of cinematicTimeline) {
        for (let i = 1; i <= scene.frameCount; i++) {
          const indexStr = i.toString().padStart(scene.padLength, '0');
          allSrcs.push(`${scene.pathPrefix}${indexStr}.${scene.extension}`);
        }
      }

      // Concurrently load in batches of 15 to prevent blocking/lagging
      const BATCH_SIZE = 15;
      for (let i = 0; i < allSrcs.length; i += BATCH_SIZE) {
        if (isCancelled) return;
        const batch = allSrcs.slice(i, i + BATCH_SIZE);
        
        await Promise.all(
          batch.map((src) => {
            return new Promise<void>((resolve) => {
              const img = new Image();
              img.src = src;
              img.onload = () => {
                if (!isCancelled) {
                  imagesRef.current[src] = img;
                  loaded++;
                  if (loaded % 10 === 0 || loaded === 1 || loaded === allSrcs.length) {
                    setLoadedCount(loaded);
                  }
                  if (currentSrcRef.current === src) {
                    drawFrame(src);
                  }
                }
                resolve();
              };
              img.onerror = () => resolve();
            });
          })
        );
      }
    };

    loadImages();

    return () => {
      isCancelled = true;
    };
  }, [totalFrames]);

  // Handle high-DPI scaling and resizing correctly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      // Set backing store dimensions scaled by device pixel ratio for retina sharpness
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      
      if (currentSrcRef.current) {
        drawFrame(currentSrcRef.current);
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Set initial size

    // Initial draw for scroll offset 0
    let currentScene = cinematicTimeline[0];
    let initialSrc = `${currentScene.pathPrefix}${'1'.padStart(currentScene.padLength, '0')}.${currentScene.extension}`;
    currentSrcRef.current = initialSrc;
    drawFrame(initialSrc);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Map scroll progress to the exact frame to render reliably
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
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

  return (
    <div className="absolute inset-0 pointer-events-none w-full h-full overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover block"
        style={{ width: '100%', height: '100%' }}
      />
      {loadedCount < totalFrames && loadedCount > 0 && (
         <div className="absolute bottom-6 right-6 text-[10px] font-mono text-white/40 mix-blend-difference">
           BUFFERING SEQ: {Math.floor((loadedCount / totalFrames) * 100)}%
         </div>
      )}
    </div>
  );
}
