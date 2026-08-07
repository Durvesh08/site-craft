import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ZovaixLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ZovaixLogo({ className, size = "md", showLabel = true }: ZovaixLogoProps) {
  const iconSizeClass =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const textSizeClass =
    size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-base";

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none group cursor-pointer", className)}>
      
      {/* Circular Orbiting Logo Container */}
      <div className={cn("relative flex items-center justify-center rounded-full p-1 bg-gradient-to-br from-primary/20 via-black to-accent/20 border border-white/10 shadow-lg", iconSizeClass)}>
        
        {/* Continuous Circular Orbital Motion Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-dashed border-primary/50 pointer-events-none"
        />

        {/* Pulsing Backlight Glow */}
        <motion.div
          animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-primary/20 blur-md pointer-events-none"
        />

        {/* Floating Movable Logo Image */}
        <motion.img
          src="/assets/zovaix-logo.png"
          alt="ZovaiX Sites Logo"
          animate={{ y: [-1, 1, -1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="h-full w-full object-contain rounded-full relative z-10 filter drop-shadow-[0_0_8px_rgba(201,155,77,0.4)]"
        />
      </div>

      {/* Brand Text */}
      {showLabel && (
        <span className={cn("font-extrabold tracking-tight text-foreground font-display flex items-center gap-1", textSizeClass)}>
          ZOVAIX<span className="text-primary font-mono text-[0.85em] font-semibold">SITES</span>
        </span>
      )}

    </div>
  );
}
