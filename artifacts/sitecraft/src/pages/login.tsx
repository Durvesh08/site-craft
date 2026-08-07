import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, ArrowRight, Loader2, Command } from "lucide-react";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";

export default function Login() {
  const { login, localLogin, localRegister } = useAuth();
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const oauthError = new URLSearchParams(window.location.search).get("error");
  const [error, setError] = useState<string | null>(
    oauthError === "oauth_not_configured"
      ? "Google sign-in isn't set up yet. Please use email/password."
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await localLogin({ email, password });
      } else {
        await localRegister({ email, password, firstName: firstName || undefined, lastName: lastName || undefined });
      }
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Left Panel: Branding & Context (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-card relative overflow-hidden border-r border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        
        {/* Animated Background Mesh */}
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[100px] animate-pulse-slow pointer-events-none" />
        <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-[120px] animate-float pointer-events-none" />

        <div className="relative z-10">
          <ZovaixLogo size="lg" />
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Build the next generation of <span className="text-gradient-primary">web experiences.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Join thousands of creators building highly optimized, beautifully designed web applications with ZOVAIX SITES Autonomous AI.
          </p>
        </div>

        <div className="relative z-10 flex items-center text-sm text-muted-foreground gap-2 font-mono">
          <Command className="h-4 w-4" /> Press <kbd className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-sans">⌘ K</kbd> to open command menu anytime
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 sm:p-12 relative">
        <Link href="/" className="absolute top-8 left-8 lg:hidden flex items-center gap-2 group">
          <ZovaixLogo size="sm" />
        </Link>

        <div className="w-full max-w-[420px] space-y-8 animate-slide-up">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 gap-3 font-medium rounded-xl hover:bg-secondary/50 transition-colors"
            onClick={() => login()}
            data-testid="button-google-login"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">or continue with email</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <Tabs value={mode} onValueChange={(v) => { setMode(v as "login" | "register"); setError(null); }} className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1 rounded-xl bg-secondary/30 border border-border/50">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 space-y-5 animate-fade-in">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-11 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full h-11 gap-2 rounded-xl text-base btn-magnetic" disabled={submitting}>
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6 space-y-5 animate-fade-in">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-first-name" className="text-sm font-medium">First name</Label>
                    <Input
                      id="register-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ada"
                      className="h-11 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-last-name" className="text-sm font-medium">Last name</Label>
                    <Input
                      id="register-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Lovelace"
                      className="h-11 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-11 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-11 rounded-xl bg-card border-border/60 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full h-11 gap-2 rounded-xl text-base btn-magnetic" disabled={submitting}>
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">Terms of Service</a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
