import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, User, Key, Server, Palette, LogOut, Check, X, Shield, Cpu, RefreshCw, Globe } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { toast } from "sonner";

type Tab = "profile" | "ftp" | "ai" | "branding";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // FTP State
  const [ftpHost, setFtpHost] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPath, setFtpPath] = useState("/");
  const [ftpProtocol, setFtpProtocol] = useState<"ftp" | "ftps" | "sftp">("ftp");
  const [isSavingFtp, setIsSavingFtp] = useState(false);
  const [isTestingFtp, setIsTestingFtp] = useState(false);
  const [ftpTestStatus, setFtpTestStatus] = useState<"none" | "success" | "failed">("none");
  const [ftpTestError, setFtpTestError] = useState("");

  // AI State
  const [geminiKey, setGeminiKey] = useState("");
  const [isSavingAi, setIsSavingAi] = useState(false);

  // Branding State
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Loading Settings State
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Initialize fields from auth user
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setProfileImageUrl(user.profileImageUrl || "");
    }
  }, [user]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        const settings = data.settings || {};

        // Deployment (FTP)
        if (settings.deployment) {
          setFtpHost(settings.deployment.ftp_host || "");
          setFtpPort(settings.deployment.ftp_port || "21");
          setFtpUsername(settings.deployment.ftp_username || "");
          setFtpPassword(settings.deployment.ftp_password || "");
          setFtpPath(settings.deployment.ftp_path || "/");
          const proto = settings.deployment.ftp_protocol;
          if (proto === "sftp" || proto === "ftps" || proto === "ftp") setFtpProtocol(proto);
          else if (settings.deployment.ftp_secure === "true") setFtpProtocol("ftps");
        }

        // AI Settings
        if (settings.ai) {
          setGeminiKey(settings.ai.gemini_api_key || "");
        }

        // Branding
        if (settings.branding) {
          setCompanyName(settings.branding.company_name || "");
          setLogoUrl(settings.branding.logo_url || "");
          setFaviconUrl(settings.branding.favicon_url || "");
          setPrimaryColor(settings.branding.primary_color || "#3b82f6");
        }
      } catch (err) {
        toast.error("Failed to load platform configurations");
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  // Save Profile Changes
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          profileImageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profile details updated successfully");
      window.location.reload(); // Reload to refresh header user state
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save FTP Changes
  const handleSaveFtp = async () => {
    setIsSavingFtp(true);
    try {
      const res = await fetch("/api/settings/deployment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ftp_host: ftpHost,
          ftp_port: ftpPort,
          ftp_username: ftpUsername,
          ftp_password: ftpPassword,
          ftp_path: ftpPath,
          ftp_protocol: ftpProtocol,
          ftp_secure: (ftpProtocol === "ftps").toString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update FTP credentials");
      toast.success("FTP settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save FTP configuration");
    } finally {
      setIsSavingFtp(false);
    }
  };

  // Test FTP Connection
  const handleTestFtp = async () => {
    setIsTestingFtp(true);
    setFtpTestStatus("none");
    setFtpTestError("");
    try {
      const res = await fetch("/api/settings/deployment/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ftp_host: ftpHost,
          ftp_port: ftpPort,
          ftp_username: ftpUsername,
          ftp_password: ftpPassword,
          ftp_protocol: ftpProtocol,
        }),
      });

      if (!res.ok) throw new Error("Connection test request failed");
      const data = await res.json();

      if (data.success) {
        setFtpTestStatus("success");
        toast.success("FTP Connection Successful!");
      } else {
        setFtpTestStatus("failed");
        setFtpTestError(data.error || "Unknown authentication error");
        toast.error("FTP Connection Failed");
      }
    } catch (err: any) {
      setFtpTestStatus("failed");
      setFtpTestError(err.message || "Request timeout");
      toast.error("Connection test failed");
    } finally {
      setIsTestingFtp(false);
    }
  };

  // Save AI Settings
  const handleSaveAi = async () => {
    setIsSavingAi(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gemini_api_key: geminiKey,
        }),
      });

      if (!res.ok) throw new Error("Failed to update AI configurations");
      toast.success("Gemini API key saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save AI configurations");
    } finally {
      setIsSavingAi(false);
    }
  };

  // Save Branding
  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          primary_color: primaryColor,
        }),
      });

      if (!res.ok) throw new Error("Failed to update branding settings");
      toast.success("Branding preferences saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save branding settings");
    } finally {
      setIsSavingBranding(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground font-mono text-sm">LOADING CONFIGURATIONS</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your server configurations, deployment protocols, API keys, and custom branding.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <nav className="flex flex-col gap-2">
          <Button
            variant={activeTab === "profile" ? "secondary" : "ghost"}
            className={`justify-start gap-2 ${activeTab === "profile" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("profile")}
          >
            <User className="h-4 w-4" />
            Profile Configuration
          </Button>
          <Button
            variant={activeTab === "ftp" ? "secondary" : "ghost"}
            className={`justify-start gap-2 ${activeTab === "ftp" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("ftp")}
          >
            <Server className="h-4 w-4" />
            FTP Server Protocols
          </Button>
          <Button
            variant={activeTab === "ai" ? "secondary" : "ghost"}
            className={`justify-start gap-2 ${activeTab === "ai" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("ai")}
          >
            <Cpu className="h-4 w-4" />
            Gemini Core Engines
          </Button>
          <Button
            variant={activeTab === "branding" ? "secondary" : "ghost"}
            className={`justify-start gap-2 ${activeTab === "branding" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("branding")}
          >
            <Palette className="h-4 w-4" />
            Branding & Themes
          </Button>
        </nav>

        <div className="space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Configure your personal identification parameters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                    {profileImageUrl ? (
                      <AvatarImage src={profileImageUrl} alt="User Avatar" />
                    ) : null}
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {((firstName || user?.email || "?").charAt(0)).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 flex-1 max-w-sm">
                    <Label htmlFor="avatar-url">Avatar Image URL</Label>
                    <Input
                      id="avatar-url"
                      value={profileImageUrl}
                      onChange={(e) => setProfileImageUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted/50 cursor-not-allowed opacity-70"
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Managed account address, non-modifiable.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30 flex justify-between">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving Profile..." : "Save Profile Details"}
                </Button>
                <Button variant="ghost" onClick={() => logout()} className="text-destructive hover:bg-destructive/10 gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out Session
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 2: FTP */}
          {activeTab === "ftp" && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>FTP Server Configuration</CardTitle>
                <CardDescription>Setup details for automated ftp publication hosting providers (e.g. Hostinger).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <div className="space-y-2">
                    <Label htmlFor="ftp-host">FTP Server Host</Label>
                    <Input
                      id="ftp-host"
                      value={ftpHost}
                      onChange={(e) => setFtpHost(e.target.value)}
                      placeholder="ftp.yourdomain.com"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ftp-port">Port</Label>
                    <Input
                      id="ftp-port"
                      value={ftpPort}
                      onChange={(e) => setFtpPort(e.target.value)}
                      placeholder="21"
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ftp-user">Username</Label>
                    <Input
                      id="ftp-user"
                      value={ftpUsername}
                      onChange={(e) => setFtpUsername(e.target.value)}
                      placeholder="ftpuser@domain.com"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ftp-pass">Password</Label>
                    <Input
                      id="ftp-pass"
                      type="password"
                      value={ftpPassword}
                      onChange={(e) => setFtpPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-background/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ftp-path">Directory Path</Label>
                  <Input
                    id="ftp-path"
                    value={ftpPath}
                    onChange={(e) => setFtpPath(e.target.value)}
                    placeholder="/public_html"
                    className="bg-background/50"
                  />
                  <p className="text-[10px] text-muted-foreground font-mono">Publication files will be uploaded directly under this folder.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ftp-protocol" className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Protocol
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["ftp", "ftps", "sftp"] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFtpProtocol(p)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          ftpProtocol === p
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card/30 text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {p.toUpperCase()}
                        <p className="text-[9px] font-normal opacity-70 mt-0.5">
                          {p === "ftp" ? "Plain, port 21" : p === "ftps" ? "Encrypted, port 21" : "SSH, port 22"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {ftpTestStatus === "success" && (
                  <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>Connection successful! Server verified.</span>
                  </div>
                )}

                {ftpTestStatus === "failed" && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    <X className="h-4 w-4 shrink-0" />
                    <span>Connection failed: {ftpTestError}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30 flex gap-4">
                <Button onClick={handleSaveFtp} disabled={isSavingFtp}>
                  {isSavingFtp ? "Saving Credentials..." : "Save FTP Settings"}
                </Button>
                <Button variant="outline" onClick={handleTestFtp} disabled={isTestingFtp || !ftpHost || !ftpUsername || !ftpPassword}>
                  {isTestingFtp ? "Testing Connection..." : "Test Connection"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 3: AI ENGINE */}
          {activeTab === "ai" && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Gemini API Key</CardTitle>
                <CardDescription>
                  SiteCraft's AI pipeline runs 13 specialized agent steps, each already tuned to the right Gemini model
                  and settings for its job — there's no single "default model" to pick. Add your own API key here to use
                  your own Gemini quota instead of the shared server key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">Gemini API Key</Label>
                  <Input
                    id="gemini-key"
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background/50"
                  />
                  <p className="text-[10px] text-muted-foreground font-mono">Stores key locally/encrypted. If left blank, uses global server variable.</p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30">
                <Button onClick={handleSaveAi} disabled={isSavingAi}>
                  {isSavingAi ? "Saving..." : "Save API Key"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 4: BRANDING */}
          {activeTab === "branding" && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Branding & Theme Customization</CardTitle>
                <CardDescription>
                  This does not change SiteCraft's own dashboard — it sets default branding (company name, logo,
                  favicon, color) that the AI weaves into every site it generates for you, unless a project's own
                  business description says otherwise. Handy if you're generating multiple sites for the same brand.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="SiteCraft Engine"
                    className="bg-background/50"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <ImageUploader
                      value={logoUrl}
                      onChange={setLogoUrl}
                      label="Logo"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Used in the header/nav of every generated site.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <ImageUploader
                      value={faviconUrl}
                      onChange={setFaviconUrl}
                      label="Favicon"
                      accept="image/png,image/x-icon,image/svg+xml"
                      maxBytes={1048576}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Browser tab icon for generated sites. Keep under 1 MB.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="primary-color">Branding Color Theme</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-20 p-1 cursor-pointer bg-background"
                    />
                    <span className="font-mono text-sm uppercase text-muted-foreground">{primaryColor}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30">
                <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
                  {isSavingBranding ? "Saving Branding Preferences..." : "Save Branding Settings"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
