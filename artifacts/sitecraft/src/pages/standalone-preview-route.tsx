import React from "react";
import { useParams } from "wouter";
import { ProjectRuntimePreview } from "@/components/preview/project-runtime-preview";

export default function StandalonePreviewRoute() {
  const { id } = useParams<{ id?: string }>();
  const projectId = id || 'lumina';

  return (
    <div className="min-h-screen w-full bg-[#090A0C] text-[#F4F4F5] font-sans overflow-x-hidden">
      <ProjectRuntimePreview projectId={projectId} />
    </div>
  );
}
