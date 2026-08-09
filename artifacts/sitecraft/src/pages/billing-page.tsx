import React from "react";
import { workspaceService } from "@/services/workspace";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Zap,
  HardDrive,
  Rocket,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from "lucide-react";

export default function BillingPage() {
  const usage = workspaceService.getUsage();

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto pb-16">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Billing & Workspace Usage</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription tier, AI token credits, storage quota, and billing history</p>
      </div>

      {/* Usage Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">AI Generation Credits</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-foreground">{usage.aiCreditsUsed.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground"> / {usage.aiCreditsTotal.toLocaleString()}</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(usage.aiCreditsUsed / usage.aiCreditsTotal) * 100}%` }} />
          </div>
        </div>

        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Asset Storage</span>
            <HardDrive className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-foreground">{(usage.storageUsedMB / 1000).toFixed(1)} GB</span>
            <span className="text-xs text-muted-foreground"> / {(usage.storageTotalMB / 1000).toFixed(0)} GB</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(usage.storageUsedMB / usage.storageTotalMB) * 100}%` }} />
          </div>
        </div>

        <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Deployments</span>
            <Rocket className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-foreground">{usage.deploymentsCount}</span>
            <span className="text-xs text-muted-foreground"> / {usage.deploymentsTotal}</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(usage.deploymentsCount / usage.deploymentsTotal) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Plan Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="p-8 rounded-3xl border flex flex-col justify-between" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div>
            <h3 className="text-lg font-bold text-foreground">Free Tier</h3>
            <span className="text-3xl font-extrabold text-foreground block mt-2 mb-4">₹0</span>
            <ul className="space-y-3 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 1 Website Project</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 1,000 AI Credits / mo</li>
            </ul>
          </div>
          <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold mt-8 border-white/10" disabled>
            Current Plan
          </Button>
        </div>

        <div className="p-8 rounded-3xl border relative shadow-2xl flex flex-col justify-between" style={{ background: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
          <div className="absolute top-0 inset-x-0 h-1 bg-primary rounded-t-3xl" />
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Pro Creator Tier</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 uppercase">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2 mb-4">
              <span className="text-3xl font-extrabold text-foreground">₹499</span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Projects</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 10,000 AI Credits / mo</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited Custom Domains</li>
            </ul>
          </div>
          <Button className="w-full h-11 rounded-xl text-xs font-semibold mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
            Manage Subscription
          </Button>
        </div>
      </div>

    </div>
  );
}
