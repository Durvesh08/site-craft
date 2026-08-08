import { useState } from "react";
import { motion } from "framer-motion";
import { soundEngine } from "@/lib/sound-effects";
import { ArrowUpRight } from "lucide-react";

interface FragmentedPreviewProps {
  title: string;
  category: string;
  image: string;
  logo: string;
  headline: string;
  bgColor: string;
}

export function FragmentedPreview({
  title,
  category,
  image,
  logo,
  headline,
  bgColor,
}: FragmentedPreviewProps) {
  const [isExploded, setIsExploded] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isExploded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y * 0.05); // Subtle tilt
    setRotateY(x * 0.05);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleClick = () => {
    soundEngine.playPrimaryClick();
    setIsExploded(!isExploded);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Perspective Container */}
      <div
        className="relative w-[340px] sm:w-[460px] h-[480px] cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <motion.div
          animate={{
            rotateX: isExploded ? 20 : rotateX,
            rotateY: isExploded ? -25 : rotateY,
            z: isExploded ? -50 : 0,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="relative w-full h-full rounded-2xl border"
          style={{ 
            borderColor: "var(--surface-border)", 
            backgroundColor: bgColor,
            transformStyle: "preserve-3d" 
          }}
        >
          {/* LAYER 1: Deep Background grid & branding (Z: -60px) */}
          <motion.div
            style={{
              transform: "translateZ(-60px)",
              transformStyle: "preserve-3d",
            }}
            className="absolute inset-0 p-8 flex flex-col justify-between border border-dashed border-white/5 rounded-2xl pointer-events-none"
          >
            <div className="flex justify-between items-center opacity-30">
              <span className="text-[10px] font-mono tracking-widest">{logo}</span>
              <span className="text-[9px] font-mono text-primary">SEC // 01</span>
            </div>
            
            {/* Grid structure overlay */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-5 pointer-events-none">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div key={idx} className="border border-white" />
              ))}
            </div>

            <div className="flex justify-between items-center opacity-25">
              <span className="text-[9px] font-mono tracking-wider">{category.toUpperCase()}</span>
              <span className="text-[9px] font-mono">© ZOVALX SITES</span>
            </div>
          </motion.div>

          {/* LAYER 2: Image Canvas Panel (Z: 0px or Exploded Z: 40px) */}
          <motion.div
            animate={{
              z: isExploded ? 40 : 0,
              scale: isExploded ? 0.95 : 1,
              opacity: isExploded ? 0.75 : 1,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 18 }}
            className="absolute inset-x-8 top-20 bottom-36 rounded-xl overflow-hidden border bg-black/40 pointer-events-none"
            style={{ borderColor: "var(--surface-border)" }}
          >
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover grayscale opacity-90 hover:grayscale-0 transition-all duration-500"
            />
          </motion.div>

          {/* LAYER 3: UI Cards / Text Fragments (Z: 40px or Exploded Z: 100px) */}
          <motion.div
            animate={{
              z: isExploded ? 100 : 20,
              x: isExploded ? 20 : 0,
              y: isExploded ? -10 : 0,
            }}
            transition={{ type: "spring", stiffness: 140, damping: 15 }}
            className="absolute inset-x-8 bottom-16 p-5 rounded-xl border backdrop-blur-md flex flex-col gap-2 pointer-events-none"
            style={{ 
              backgroundColor: "rgba(9, 9, 15, 0.85)", 
              borderColor: "var(--surface-border)" 
            }}
          >
            <h3 className="text-lg font-serif font-light text-foreground">{headline}</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Bespoke typography pairs, structural alignment, and fluid scroll interactions mapped automatically.
            </p>
          </motion.div>

          {/* LAYER 4: Brand badge / CTA buttons (Z: 80px or Exploded Z: 160px) */}
          <motion.div
            animate={{
              z: isExploded ? 160 : 40,
              x: isExploded ? -20 : 0,
              y: isExploded ? 15 : 0,
            }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
            className="absolute bottom-6 right-8 left-8 flex justify-between items-center pointer-events-none"
          >
            <div className="px-3.5 py-1.5 rounded-full border text-[10px] font-mono bg-black/85" style={{ borderColor: "var(--surface-border)" }}>
              {isExploded ? "CLICK TO COLLAPSE" : "EXPLODE WEBSITE LAYERS"}
            </div>
            
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
