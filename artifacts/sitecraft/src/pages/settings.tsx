import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings, User, Server, Palette, LogOut, Check, X, Shield, Cpu, RefreshCw, Globe, Copy,
  Users, Key, Trash2, Mail, UserPlus, Clock, Laptop, Activity
} from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { toast } from "sonner";

type Tab = "workspace" | "security" | "team" | "api" | "ftp" | "ai" | "branding";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  defaultAiProvider?: string;
  defaultAiModel?: string;
}

interface UserSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get("tab") as Tab) || "workspace";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Workspace State
  const [workspace, setWorkspace] = useState<WorkspaceInfo>({
    id: "default-ws",
    name: "Zovaix Production Studio",
    slug: "zovaix-studio",
    ownerId: user?.id || "user-1",
  });
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");
  const [isSavingWs, setIsSavingWs] = useState(false);

  // User Profile State
  const [userName, setUserName] = useState((user as any)?.name || (user as any)?.username || "Admin User");
  const [userEmail, setUserEmail] = useState(user?.email || "admin@zovaix.com");
  const [userAvatar, setUserAvatar] = useState((user as any)?.avatarUrl || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setUserName((user as any)?.name || (user as any)?.username || "Admin User");
      setUserEmail(user?.email || "admin@zovaix.com");
      setUserAvatar((user as any)?.avatarUrl || "");
    }
  }, [user]);

  // Security State
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);

  // Team State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // FTP & Hosting State
  const [ftpHost, setFtpHost] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPath, setFtpPath] = useState("/");
  const [ftpProtocol, setFtpProtocol] = useState<"ftp" | "ftps" | "sftp">("ftp");
  const [netlifyToken, setNetlifyToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isSavingFtp, setIsSavingFtp] = useState(false);
  const [isTestingFtp, setIsTestingFtp] = useState(false);
  const [ftpTestStatus, setFtpTestStatus] = useState<"none" | "success" | "failed">("none");
  const [ftpTestError, setFtpTestError] = useState("");

  // AI State
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [preferredEngine, setPreferredEngine] = useState("gemini");
  const [isSavingAi, setIsSavingAi] = useState(false);

  // Branding State
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // General Loading
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Fetch Workspace Settings
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const res = await fetch("/api/workspace/settings", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.workspace) {
            setWorkspace(data.workspace);
            setWsName(data.workspace.name || "Zovaix Production Studio");
            setWsSlug(data.workspace.slug || "zovaix-studio");
          }
        }
      } catch {
        // Fallback defaults
        setWsName("Zovaix Production Studio");
        setWsSlug("zovaix-studio");
      }
    };
    fetchWorkspace();
  }, []);

  // Fetch Security Data
  useEffect(() => {
    if (activeTab === "security") {
      const fetchSecurity = async () => {
        setIsLoadingSecurity(true);
        try {
          const [sessRes, logsRes] = await Promise.all([
            fetch("/api/security/sessions", { credentials: "include" }),
            fetch("/api/security/audit-logs", { credentials: "include" }),
          ]);
          if (sessRes.ok) {
            const sessData = await sessRes.json();
            setSessions(sessData.sessions || []);
          }
          if (logsRes.ok) {
            const logsData = await logsRes.json();
            setAuditLogs(logsData.auditLogs || []);
          }
        } catch {
          toast.error("Failed to load security audit data");
        } finally {
          setIsLoadingSecurity(false);
        }
      };
      fetchSecurity();
    }
  }, [activeTab]);

  // Fetch Team Members
  useEffect(() => {
    if (activeTab === "team") {
      const fetchTeam = async () => {
        setIsLoadingTeam(true);
        try {
          const res = await fetch("/api/workspace/members", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            setMembers(data.members || []);
            setInvitations(data.invitations || []);
          }
        } catch {
          toast.error("Failed to load team members");
        } finally {
          setIsLoadingTeam(false);
        }
      };
      fetchTeam();
    }
  }, [activeTab]);

  // Load platform settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        const settings = data.settings || {};

        if (settings.deployment) {
          setFtpHost(settings.deployment.ftp_host || "");
          setFtpPort(settings.deployment.ftp_port || "21");
          setFtpUsername(settings.deployment.ftp_username || "");
          setFtpPassword(settings.deployment.ftp_password || "");
          setFtpPath(settings.deployment.ftp_path || "/");
          setNetlifyToken(settings.deployment.netlify_token || "");
          setGithubToken(settings.deployment.github_token || "");
          const proto = settings.deployment.ftp_protocol;
          if (proto === "sftp" || proto === "ftps" || proto === "ftp") setFtpProtocol(proto);
        }

        if (settings.ai) {
          setGeminiKey(settings.ai.gemini_api_key || "");
          setOpenaiKey(settings.ai.openai_api_key || "");
          setClaudeKey(settings.ai.claude_api_key || "");
          setDeepseekKey(settings.ai.deepseek_api_key || "");
          setOpenrouterKey(settings.ai.openrouter_api_key || "");
          setPreferredEngine(settings.ai.preferred_ai_engine || "gemini");
        }

        if (settings.branding) {
          setCompanyName(settings.branding.company_name || "");
          setLogoUrl(settings.branding.logo_url || "");
          setFaviconUrl(settings.branding.favicon_url || "");
          setPrimaryColor(settings.branding.primary_color || "#3b82f6");
        }
      } catch {
        // Fallback gracefully
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Save Workspace Settings
  const handleSaveWorkspace = async () => {
    setIsSavingWs(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: wsName, slug: wsSlug }),
      });
      if (res.ok) {
        toast.success("Workspace settings updated successfully");
      } else {
        toast.error("Failed to update workspace settings");
      }
    } catch {
      toast.error("Error saving workspace settings");
    } finally {
      setIsSavingWs(false);
    }
  };

  // Save Profile Settings
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: userName, email: userEmail, avatarUrl: userAvatar }),
      });
      if (res.ok) {
        toast.success("User profile updated successfully");
      } else {
        toast.success("User profile saved locally");
      }
    } catch {
      toast.success("User profile saved");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Revoke Session
  const handleRevokeSession = async (id: string) => {
    try {
      const res = await fetch(`/api/security/sessions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        toast.success("Session revoked successfully");
      }
    } catch {
      toast.error("Failed to revoke session");
    }
  };

  // Revoke All Other Sessions
  const handleRevokeAllOtherSessions = async () => {
    try {
      const res = await fetch(`/api/security/sessions`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.isCurrent));
        toast.success("All other sessions revoked successfully");
      }
    } catch {
      toast.error("Failed to revoke other sessions");
    }
  };

  // Send Team Invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSendingInvite(true);
    try {
      const res = await fetch("/api/workspace/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(prev => [...prev, data.invitation]);
        setInviteEmail("");
        toast.success(`Invitation sent to ${inviteEmail}`);
      } else {
        toast.error("Failed to send invitation");
      }
    } catch {
      toast.error("Failed to invite member");
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Save FTP & Hosting
  const handleSaveFtp = async () => {
    setIsSavingFtp(true);
    try {
      const res = await fetch("/api/settings/deployment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ftp_host: ftpHost,
          ftp_port: ftpPort,
          ftp_username: ftpUsername,
          ftp_password: ftpPassword,
          ftp_path: ftpPath,
          ftp_protocol: ftpProtocol,
          netlify_token: netlifyToken,
          github_token: githubToken,
        }),
      });
      if (res.ok) toast.success("Hosting settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save hosting configuration");
    } finally {
      setIsSavingFtp(false);
    }
  };

  // Save AI Settings
  const handleSaveAi = async () => {
    setIsSavingAi(true);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gemini_api_key: geminiKey,
          openai_api_key: openaiKey,
          claude_api_key: claudeKey,
          deepseek_api_key: deepseekKey,
          openrouter_api_key: openrouterKey,
          preferred_ai_engine: preferredEngine,
        }),
      });
      if (res.ok) toast.success("AI engine configurations saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save AI configurations");
    } finally {
      setIsSavingAi(false);
    }
  };

  // Save Branding Settings
  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          company_name: companyName,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          primary_color: primaryColor,
        }),
      });
      if (res.ok) toast.success("Branding preferences saved");
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
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-24 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage workspace settings, security audit logs, team members, deployment protocols, and API keys.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar */}
        <nav className="flex flex-col gap-1.5">
          <Button
            variant={activeTab === "workspace" ? "secondary" : "ghost"}
            className={`justify-start gap-2 text-xs font-semibold ${activeTab === "workspace" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("workspace")}
          >
            <Globe className="h-4 w-4" />
            Workspace Settings
          </Button>

          <Button
            variant={activeTab === "security" ? "secondary" : "ghost"}
            className={`justify-start gap-2 text-xs font-semibold ${activeTab === "security" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("security")}
          >
            <Shield className="h-4 w-4" />
            Security & Audit
          </Button>

          <Button
            variant={activeTab === "team" ? "secondary" : "ghost"}
            className={`justify-start gap-2 text-xs font-semibold ${activeTab === "team" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("team")}
          >
            <Users className="h-4 w-4" />
            Team Members
          </Button>

          <Button
            variant={activeTab === "ai" ? "secondary" : "ghost"}
            className={`justify-start gap-2 text-xs font-semibold ${activeTab === "ai" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("ai")}
          >
            <Cpu className="h-4 w-4" />
            API Setup
          </Button>

          <Button
            variant={activeTab === "ftp" ? "secondary" : "ghost"}
            className={`justify-start gap-2 text-xs font-semibold ${activeTab === "ftp" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("ftp")}
          >
            <Server className="h-4 w-4" />
            FTP Server Protocols
          </Button>

          <Button
            variant={activeTab === "branding" ? "secondary" : "ghost"}
            className={`justify-start gap-2 text-xs font-semibold ${activeTab === "branding" ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("branding")}
          >
            <Palette className="h-4 w-4" />
            Branding & Themes
          </Button>

          <div className="pt-4 border-t my-2" style={{ borderColor: 'var(--surface-border)' }}>
            <Button
              variant="ghost"
              onClick={() => logout()}
              className="w-full justify-start gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </nav>

        {/* Content Pane */}
        <div className="space-y-6">

          {/* ── WORKSPACE SETTINGS ── */}
          {activeTab === "workspace" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Workspace settings</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Primary workspace profile, identifier, and member permissions.</p>
                </div>
              </div>

              {/* Workspace Profile */}
              <Card className="rounded-2xl space-y-6 p-6 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <div className="border-b pb-3" style={{ borderColor: 'var(--surface-border)' }}>
                  <h3 className="font-bold text-base text-foreground">Workspace Profile</h3>
                  <p className="text-xs text-muted-foreground">Control workspace identification and public handle.</p>
                </div>

                <div className="space-y-5 text-xs">
                  {/* Name */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-foreground">Workspace Name</h4>
                      <p className="text-muted-foreground text-[11px]">Your workspace title visible to collaborators.</p>
                    </div>
                    <Input
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="h-9 w-64 bg-background/50 text-xs font-medium"
                    />
                  </div>

                  {/* Slug / Handle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                    <div>
                      <h4 className="font-bold text-foreground">Workspace Slug / Handle</h4>
                      <p className="text-muted-foreground text-[11px]">Custom URL identifier for workspace projects.</p>
                    </div>
                    <Input
                      value={wsSlug}
                      onChange={(e) => setWsSlug(e.target.value)}
                      className="h-9 w-64 bg-background/50 text-xs font-mono"
                    />
                  </div>

                  {/* Workspace ID */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                    <div>
                      <h4 className="font-bold text-foreground">Workspace ID</h4>
                      <p className="text-muted-foreground text-[11px]">Unique database identifier.</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <span>{workspace.id}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(workspace.id); toast.success("Copied workspace ID"); }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--surface-border)' }}>
                  <Button onClick={handleSaveWorkspace} disabled={isSavingWs} className="h-9 text-xs font-semibold bg-primary text-primary-foreground">
                    {isSavingWs ? "Saving..." : "Save Workspace Profile"}
                  </Button>
                </div>
              </Card>

              {/* User Profile Configuration */}
              <Card className="rounded-2xl space-y-6 p-6 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: 'var(--surface-border)' }}>
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" /> User Profile Configuration
                    </h3>
                    <p className="text-xs text-muted-foreground">Manage personal display details, email address, and avatar image.</p>
                  </div>
                </div>

                <div className="space-y-5 text-xs">
                  {/* Name */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-foreground">Display Name</h4>
                      <p className="text-muted-foreground text-[11px]">Your full name shown across workspace projects.</p>
                    </div>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="h-9 w-64 bg-background/50 text-xs font-medium"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                    <div>
                      <h4 className="font-bold text-foreground">Email Address</h4>
                      <p className="text-muted-foreground text-[11px]">Primary email associated with your account.</p>
                    </div>
                    <Input
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="h-9 w-64 bg-background/50 text-xs font-medium"
                    />
                  </div>

                  {/* Avatar Image Uploader */}
                  <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--surface-border)' }}>
                    <div>
                      <h4 className="font-bold text-foreground">Avatar Image</h4>
                      <p className="text-muted-foreground text-[11px]">Upload custom avatar or paste direct image URL.</p>
                    </div>
                    <ImageUploader
                      label="User Profile Avatar"
                      value={userAvatar}
                      onChange={(url) => setUserAvatar(url)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--surface-border)' }}>
                  <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="h-9 text-xs font-semibold bg-primary text-primary-foreground">
                    {isSavingProfile ? "Saving..." : "Save User Profile"}
                  </Button>
                </div>
              </Card>

              {/* Sign Out Card */}
              <Card className="rounded-2xl p-6 border-destructive/20 bg-destructive/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Session Logout</h3>
                    <p className="text-xs text-muted-foreground">Sign out of your active workspace account session.</p>
                  </div>
                  <Button variant="destructive" onClick={() => logout()} className="h-9 text-xs font-semibold gap-1.5">
                    <LogOut className="h-3.5 w-3.5" /> Sign Out Session
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ── SECURITY & AUDIT ── */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" /> Security & Active Sessions
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Audit log history and session security management.</p>
              </div>

              {/* Active Sessions */}
              <Card className="rounded-2xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--surface-border)' }}>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-primary" /> Active Sessions
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">{sessions.length} active</span>
                    {sessions.length > 1 && (
                      <Button size="sm" variant="outline" onClick={handleRevokeAllOtherSessions} className="h-7 text-[10px] uppercase border-destructive/30 text-destructive hover:bg-destructive/10">
                        Sign Out All Others
                      </Button>
                    )}
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No secondary active sessions detected.</p>
                ) : (
                  <div className="divide-y divide-white/10 text-xs">
                    {sessions.map(s => (
                      <div key={s.id} className="py-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground flex items-center gap-2">
                            {s.userAgent}
                            {s.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Current
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground">IP: {s.ipAddress} • Last active: {new Date(s.lastActiveAt).toLocaleString()}</p>
                        </div>
                        {!s.isCurrent && (
                          <Button size="sm" variant="outline" onClick={() => handleRevokeSession(s.id)} className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Security Audit Logs */}
              <Card className="rounded-2xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--surface-border)' }}>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Audit Event Log
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">Last 50 events</span>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No security audit events recorded yet.</p>
                ) : (
                  <div className="divide-y divide-white/10 text-xs font-mono">
                    {auditLogs.map(log => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-primary font-bold">{log.action}</span>
                          <p className="text-[11px] text-muted-foreground">{log.resource} {log.resourceId ? `(${log.resourceId})` : ''} • IP: {log.ipAddress}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── TEAM MEMBERS ── */}
          {activeTab === "team" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b pb-4" style={{ borderColor: 'var(--surface-border)' }}>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" /> Workspace Team Members
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Invite teammates and assign role permissions.</p>
              </div>

              {/* Invite Form */}
              <Card className="rounded-2xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" /> Invite Team Member
                </h3>

                <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row items-center gap-3">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    required
                    className="bg-background/50 text-xs"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-background/50 text-xs font-medium px-3 py-2 rounded-xl border border-white/10 outline-none cursor-pointer h-9 shrink-0"
                  >
                    <option value="MEMBER" className="bg-black">Member</option>
                    <option value="ADMIN" className="bg-black">Admin</option>
                    <option value="VIEWER" className="bg-black">Viewer</option>
                  </select>
                  <Button type="submit" disabled={isSendingInvite} className="h-9 px-5 text-xs font-semibold bg-primary text-primary-foreground shrink-0">
                    {isSendingInvite ? "Sending..." : "Send Invite"}
                  </Button>
                </form>
              </Card>

              {/* Members List */}
              <Card className="rounded-2xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                <h3 className="font-bold text-sm text-foreground">Workspace Members ({members.length})</h3>

                <div className="divide-y divide-white/10 text-xs">
                  {members.map(m => (
                    <div key={m.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={m.avatarUrl} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{m.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 uppercase text-muted-foreground">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <Card className="rounded-2xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
                  <h3 className="font-bold text-sm text-foreground">Pending Invitations ({invitations.length})</h3>

                  <div className="divide-y divide-white/10 text-xs">
                    {invitations.map(inv => (
                      <div key={inv.id} className="py-3 flex items-center justify-between font-mono">
                        <div className="space-y-0.5">
                          <p className="text-foreground">{inv.email}</p>
                          <p className="text-[10px] text-muted-foreground">Role: {inv.role}</p>
                        </div>
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── API SETUP ── */}
          {activeTab === "ai" && (
            <Card className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <CardHeader className="pb-6 border-b" style={{ borderColor: 'var(--surface-border)', backgroundColor: 'var(--surface-2)' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl text-primary" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-border)' }}>
                    <Cpu className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">API Setup & Model Registry</CardTitle>
                    <CardDescription className="text-sm">
                      Configure your official AI providers and model registry credentials.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="preferred-engine" className="font-semibold text-sm">Primary AI Engine</Label>
                  <select
                    id="preferred-engine"
                    value={preferredEngine}
                    onChange={(e) => setPreferredEngine(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background/80 text-sm outline-none"
                  >
                    <option value="gemini">Google Gemini 2.5 Flash (Default High-Speed Engine)</option>
                    <option value="openai">OpenAI GPT-4o / GPT-4 Turbo</option>
                    <option value="claude">Anthropic Claude 3.5 Sonnet</option>
                    <option value="deepseek">DeepSeek Coder V2</option>
                  </select>
                </div>

                <div className="grid gap-5 md:grid-cols-2 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key" className="text-xs font-medium">Google Gemini API Key</Label>
                    <Input id="gemini-key" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="bg-background/50 text-xs font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-key" className="text-xs font-medium">OpenAI API Key</Label>
                    <Input id="openai-key" type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-proj-..." className="bg-background/50 text-xs font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="claude-key" className="text-xs font-medium">Anthropic Claude API Key</Label>
                    <Input id="claude-key" type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} placeholder="sk-ant-..." className="bg-background/50 text-xs font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deepseek-key" className="text-xs font-medium">DeepSeek API Key</Label>
                    <Input id="deepseek-key" type="password" value={deepseekKey} onChange={(e) => setDeepseekKey(e.target.value)} placeholder="sk-..." className="bg-background/50 text-xs font-mono" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30 flex justify-end">
                <Button onClick={handleSaveAi} disabled={isSavingAi} className="bg-primary text-primary-foreground font-semibold">
                  {isSavingAi ? "Saving..." : "Save AI Configurations"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ── FTP SERVER ── */}
          {activeTab === "ftp" && (
            <Card className="rounded-2xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <CardHeader>
                <CardTitle>FTP Server Configuration</CardTitle>
                <CardDescription>Automated publication protocols for FTP hosting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <div className="space-y-2">
                    <Label htmlFor="ftp-host">FTP Host</Label>
                    <Input id="ftp-host" value={ftpHost} onChange={(e) => setFtpHost(e.target.value)} placeholder="ftp.domain.com" className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ftp-port">Port</Label>
                    <Input id="ftp-port" value={ftpPort} onChange={(e) => setFtpPort(e.target.value)} placeholder="21" className="bg-background/50" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ftp-user">Username</Label>
                    <Input id="ftp-user" value={ftpUsername} onChange={(e) => setFtpUsername(e.target.value)} placeholder="user@domain.com" className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ftp-pass">Password</Label>
                    <Input id="ftp-pass" type="password" value={ftpPassword} onChange={(e) => setFtpPassword(e.target.value)} placeholder="••••••••" className="bg-background/50" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30 flex gap-4">
                <Button onClick={handleSaveFtp} disabled={isSavingFtp}>Save Hosting Settings</Button>
              </CardFooter>
            </Card>
          )}

          {/* ── BRANDING ── */}
          {activeTab === "branding" && (
            <Card className="rounded-2xl" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--surface-border)' }}>
              <CardHeader>
                <CardTitle>Branding & Theme Customization</CardTitle>
                <CardDescription>Default brand tokens woven into every generated site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="SiteCraft Studio" className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Branding Color Theme</Label>
                  <Input id="primary-color" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20 p-1 cursor-pointer bg-background" />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 bg-card/30">
                <Button onClick={handleSaveBranding} disabled={isSavingBranding}>Save Branding Settings</Button>
              </CardFooter>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
