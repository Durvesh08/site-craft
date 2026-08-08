import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  phase: number;
}

export function ZovaixFabric() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const scrollRef = useRef({ y: 0, targetY: 0, speed: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize structured grid points
    const nodes: Node[] = [];
    const cols = 12;
    const rows = 8;
    const xSpacing = width / (cols - 1);
    const ySpacing = height / (rows - 1);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * xSpacing;
        const y = r * ySpacing;
        nodes.push({
          x,
          y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * 2 + 1,
          phase: Math.random() * 100,
        });
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleScroll = () => {
      scrollRef.current.targetY = window.scrollY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth scroll updates & compute velocity
      const lastScrollY = scrollRef.current.y;
      scrollRef.current.y += (scrollRef.current.targetY - scrollRef.current.y) * 0.08;
      scrollRef.current.speed = Math.abs(scrollRef.current.y - lastScrollY);

      // Interpolate mouse coordinates
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1;

      // Draw global structural wireframes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 100;
      const scrollOffset = (scrollRef.current.y * 0.15) % gridSize;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -scrollOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & Draw nodes
      nodes.forEach((node) => {
        // Subtle drift movement
        node.phase += 0.01;
        const driftX = Math.sin(node.phase) * 12;
        const driftY = Math.cos(node.phase) * 12;

        // Apply scroll rotation/spin effect
        const spinFactor = scrollRef.current.y * 0.0005;
        const rotatedX = node.originX + driftX;
        const rotatedY = node.originY + driftY - scrollRef.current.y * 0.1;

        // Mouse displacement
        let dispX = 0;
        let dispY = 0;
        if (mouseRef.current.active) {
          const dx = rotatedX - mouseRef.current.x;
          const dy = rotatedY - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = (150 - dist) / 150;
            dispX = (dx / dist) * force * 25;
            dispY = (dy / dist) * force * 25;
          }
        }

        // Apply physics forces
        node.x += (rotatedX + dispX - node.x) * 0.1;
        node.y += (rotatedY + dispY - node.y) * 0.1;

        // Draw node dot
        ctx.fillStyle = "rgba(237, 236, 231, 0.25)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connecting lines with dynamic opacity depending on scroll speed
      ctx.strokeStyle = `rgba(237, 236, 231, ${0.03 + Math.min(scrollRef.current.speed * 0.005, 0.08)})`;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
}
