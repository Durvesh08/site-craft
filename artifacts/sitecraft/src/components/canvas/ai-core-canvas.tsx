import { useEffect, useRef } from "react";

export function AICoreCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: width / 2, y: height / 2, tx: width / 2, ty: height / 2 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // Orbital particles for 3D AI Core
    const coreRadius = Math.min(width, height) * 0.22;
    const particles = Array.from({ length: 120 }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = coreRadius + (Math.random() - 0.5) * 40;
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        ox: r * Math.sin(phi) * Math.cos(theta),
        oy: r * Math.sin(phi) * Math.sin(theta),
        oz: r * Math.cos(phi),
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.01 + 0.003,
        hue: Math.random() * 60 + 230, // Purple/cyan
      };
    });

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.fillStyle = "rgba(5, 5, 10, 0.25)";
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2 + (mouse.x - width / 2) * 0.1;
      const centerY = height / 2 + (mouse.y - height / 2) * 0.1;

      angleX += 0.005;
      angleY += 0.007;

      // Draw glowing central core aura
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, coreRadius * 1.5);
      grad.addColorStop(0, "rgba(99, 102, 241, 0.3)");
      grad.addColorStop(0.5, "rgba(168, 85, 247, 0.15)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Sort particles by Z depth
      particles.sort((a, b) => b.z - a.z);

      // Rotate and draw 3D particles
      particles.forEach((p) => {
        // Rotate around Y
        let x1 = p.ox * Math.cos(angleY) - p.oz * Math.sin(angleY);
        let z1 = p.ox * Math.sin(angleY) + p.oz * Math.cos(angleY);

        // Rotate around X
        let y2 = p.oy * Math.cos(angleX) - z1 * Math.sin(angleX);
        let z2 = p.oy * Math.sin(angleX) + z1 * Math.cos(angleX);

        p.x = x1;
        p.y = y2;
        p.z = z2;

        const perspective = 600 / (600 + z2);
        const px = centerX + x1 * perspective;
        const py = centerY + y2 * perspective;
        const size = p.size * perspective * 1.5;
        const alpha = Math.min(Math.max((z2 + coreRadius) / (2 * coreRadius), 0.1), 0.9);

        ctx.beginPath();
        ctx.arc(px, py, Math.max(size, 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${p.hue}, 85%, 65%, 0.6)`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
}
