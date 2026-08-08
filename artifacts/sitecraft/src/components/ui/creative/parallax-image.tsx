import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number; // Speed multiplier (e.g. 0.8 to move slower, creating depth)
}

export function ParallaxImage({ src, alt, className = "", speed = 0.85 }: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Map progress [0, 1] to y translations. Higher multiplier means more movement.
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden w-full h-full ${className}`}
    >
      <motion.img
        src={src}
        alt={alt}
        style={{ y, scale: 1.25 }}
        className="absolute inset-0 w-full h-full object-cover"
        transition={{ ease: "easeOut" }}
      />
    </div>
  );
}
