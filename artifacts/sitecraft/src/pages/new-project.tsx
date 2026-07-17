import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateProject, useGenerateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Wand2, Settings2, ArrowRight, LayoutTemplate, ImageIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/ImageUploader";

const formSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters."),
  businessDescription: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description is too long."),
});

type QuickStart = {
  id: string;
  label: string;
  name: string;
  businessDescription: string;
};

const QUICK_STARTS: QuickStart[] = [
  {
    id: "saas",
    label: "SaaS / Tech",
    name: "Flowstate",
    businessDescription: "We are a project management SaaS for remote teams, offering real-time collaboration boards, automated status reports, and integrations with Slack and GitHub. Our personality is clean, confident, and engineering-forward. We want a landing page that highlights our free trial and builds trust with engineering leads.",
  },
  {
    id: "ecommerce",
    label: "E-Commerce",
    name: "Northfield Goods",
    businessDescription: "We sell handcrafted leather goods — wallets, bags, and belts — made in small batches from full-grain leather. Our brand is rugged, warm, and artisanal. We want a visually rich storefront landing page that showcases the craftsmanship, highlights free shipping and a lifetime warranty, and lets the materials speak for themselves.",
  },
  {
    id: "agency",
    label: "Agency",
    name: "Halo Studio",
    businessDescription: "We are a boutique branding and web design agency working with early-stage startups. Our aesthetic is refined, editorial, and minimal — we let the work speak. We want an elegant portfolio-driven landing page that showcases case studies and makes it easy for founders to book a discovery call.",
  },
  {
    id: "restaurant",
    label: "Restaurant",
    name: "Ember & Oak",
    businessDescription: "We are a wood-fired neighborhood restaurant known for seasonal small plates and natural wine. Our atmosphere is warm, candlelit, and unhurried. We want a landing page that feels as inviting as the dining room — featuring our menu, story, and an easy way for guests to book a table.",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    name: "Jordan Kim — Design",
    businessDescription: "I'm a freelance product designer specializing in fintech and B2B dashboards. My work is precise, systematic, and human-centered. I want a sharp personal portfolio site showing selected case studies, my design process, and a way for clients to get in touch — developer-credible, not decorative.",
  },
];

export default function NewProject() {
  const [, setLocation] = useLocation();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [activeQuickStart, setActiveQuickStart] = useState<string | null>(null);

  const createProject = useCreateProject();
  const generateProject = useGenerateProject();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      businessDescription: "",
    },
  });

  function applyQuickStart(qs: QuickStart) {
    setActiveQuickStart(qs.id);
    form.setValue("name", qs.name, { shouldValidate: true });
    form.setValue("businessDescription", qs.businessDescription, { shouldValidate: true });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const project = await createProject.mutateAsync({
        data: {
          name: values.name,
          businessDescription: values.businessDescription,
        },
      });

      const job = await generateProject.mutateAsync({
        id: project.id,
        data: {
          businessDescription: values.businessDescription,
          logoUrl: logoUrl || undefined,
        },
      });

      toast.success("Project created and generation started!");
      setLocation(`/projects/${project.id}/generate?jobId=${job.id}`);
    } catch {
      toast.error("Failed to create project. Please try again.");
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
        <p className="text-muted-foreground mt-1">
          Describe your business — the AI reads your words, not a category label, and builds from there.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* Quick Starts */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Pre-written examples to get started fast — or skip and write your own description below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {QUICK_STARTS.map((qs) => (
                  <Button
                    key={qs.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 rounded-full",
                      activeQuickStart === qs.id && "border-primary bg-primary/10 text-primary"
                    )}
                    onClick={() => applyQuickStart(qs)}
                    data-testid={`button-quickstart-${qs.id}`}
                  >
                    {qs.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main description card */}
          <Card className="glass-panel border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Describe Your Business
              </CardTitle>
              <CardDescription>
                The more personality and specificity you give, the more distinctive the design will be. Mention your vibe, materials, audience, what sets you apart, and what you want visitors to feel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp Landing Page" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="We are a boutique coffee roaster in San Francisco specializing in single-origin beans sourced directly from farmers in Ethiopia and Colombia. Our brand is warm, earthy, and community-driven — we host weekly cuppings and want our site to feel like an invitation, not a sales pitch. Highlight our subscription service and the stories behind each origin."
                        className="min-h-[180px] text-base resize-y bg-background/50 leading-relaxed"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="flex justify-between">
                      <span>Describe your tone, materials, audience, and what makes you different — the AI builds from your words.</span>
                      <span className="font-mono text-xs">{field.value.length}/1000</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Advanced Directives — logo upload only */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <Card className="glass-panel">
              <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between -ml-4 hover:bg-transparent hover:text-primary">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      <span className="font-semibold">Brand Assets</span>
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {isAdvancedOpen ? "HIDE" : "SHOW"}
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Brand Logo</span>
                    </div>
                    <ImageUploader
                      value={logoUrl}
                      onChange={setLogoUrl}
                      label="Logo"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    />
                    <p className="text-xs text-muted-foreground">
                      The AI will place your logo in the generated site's header and footer.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              size="lg"
              className="gap-2 px-8 h-12 text-lg shadow-lg shadow-primary/20"
              disabled={createProject.isPending || generateProject.isPending}
            >
              {createProject.isPending || generateProject.isPending ? (
                <>
                  <Wand2 className="h-5 w-5 animate-spin" />
                  Initializing Agents...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  Generate Site
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
