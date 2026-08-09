import React from "react";
import { projectsService } from "@/services/projects";
import { filesService } from "@/services/files";

interface ProjectRuntimePreviewProps {
  projectId: string;
}

/**
 * Isolated Project Runtime Preview Component
 * Renders ONLY the user's project application code (e.g. Pulsar Analytics, Lumina Architecture)
 * Hard separation: Zero Zovaix platform navigation, branding, or marketing CSS leakage.
 */
export function ProjectRuntimePreview({ projectId }: ProjectRuntimePreviewProps) {
  const rawProject = projectsService.getById(projectId) || projectsService.getAll()[0];
  const project = rawProject || {
    id: projectId,
    name: projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: `Bespoke AI application for ${projectId}`,
    domain: `${projectId}.zovaix.site`,
    status: 'draft',
  };
  const filesTree = filesService.getFilesForProject(project.id);

  // Render bespoke project layouts depending on project ID / content
  if (project.id === 'pulsar') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#F3F4F6] font-sans selection:bg-blue-500/30 p-8 space-y-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">P</div>
            <span className="font-bold text-lg text-white">Pulsar Cloud</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-400 font-medium">
            <a href="#telemetry" className="hover:text-white transition-colors">Telemetry</a>
            <a href="#metrics" className="hover:text-white transition-colors">Metrics</a>
            <a href="#docs" className="hover:text-white transition-colors">Docs</a>
          </nav>
        </header>

        <main className="max-w-4xl mx-auto text-center space-y-6 pt-12">
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Real-time Telemetry v2.4
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-white">
            Real-time analytics engine for modern cloud architecture
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Stream millions of event metrics per second with sub-millisecond query latency.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
              Start Free Trial →
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (project.id === 'clout') {
    return (
      <div className="min-h-screen bg-[#070709] text-white font-sans selection:bg-purple-500/30 p-8 space-y-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-xl tracking-wider text-purple-500">CLOUT</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#tournaments" className="hover:text-white">Tournaments</a>
            <a href="#teams" className="hover:text-white">Teams</a>
            <a href="#merch" className="hover:text-white">Merch</a>
          </nav>
        </header>

        <main className="max-w-4xl mx-auto text-center space-y-6 pt-12">
          <h1 className="text-6xl font-extrabold text-white tracking-tight uppercase">
            Esports & Tournament Arena
          </h1>
          <p className="text-gray-400 text-lg">Competitive gaming community portal & instant merch store.</p>
        </main>
      </div>
    );
  }

  if (project.id === 'sonora') {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-[#E4E4E7] font-sans selection:bg-emerald-500/30 p-8 space-y-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <span className="font-light tracking-widest text-lg text-white uppercase">SONORA</span>
          <nav className="flex items-center gap-6 text-xs font-mono text-gray-400">
            <a href="#specs" className="hover:text-white">Specs</a>
            <a href="#acoustics" className="hover:text-white">Acoustics</a>
          </nav>
        </header>

        <main className="max-w-3xl mx-auto text-center space-y-6 pt-16">
          <span className="text-xs font-mono tracking-widest text-emerald-400 uppercase">Wireless Acoustic Headphones</span>
          <h1 className="text-5xl font-light text-white tracking-tight">Pure Sound. Zero Distortion.</h1>
          <p className="text-gray-400 text-sm">Bespoke aluminum drivers and active spatial noise cancellation.</p>
        </main>
      </div>
    );
  }

  // Default Lumina / Generic Bespoke Layout
  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F4F4F5] font-sans p-8 space-y-12 select-none">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <span className="font-bold text-lg text-white">{project.name}</span>
        <nav className="flex items-center gap-6 text-sm text-zinc-400 font-medium">
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#work" className="hover:text-white transition-colors">Portfolio</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto text-center space-y-6 pt-12">
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Bespoke Experience</span>
        <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
          {project.name}
        </h1>
        <p className="text-zinc-400 text-base max-w-xl mx-auto leading-relaxed">
          {project.description}
        </p>
        <div className="pt-4">
          <button className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors">
            Explore Project →
          </button>
        </div>
      </main>
    </div>
  );
}
