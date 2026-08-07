import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ZovaixLogo } from "@/components/ui/zovaix-logo";
import {
  Home,
  Folder,
  PlusCircle,
  Rocket,
  MessageSquare,
  Settings,
  LogOut
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Create Website", href: "/new", icon: PlusCircle },
    { name: "Publish", href: "/deployments", icon: Rocket },
    { name: "AI Assistant", href: "/prompts", icon: MessageSquare },
  ];

  return (
    <div
      className={cn(
        "flex h-full w-[260px] flex-col bg-white border-r border-[#E8EAF2] shadow-sm relative font-sans",
        className
      )}
    >
      {/* Top Brand Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-[#E8EAF2]">
        <Link href="/dashboard" className="flex items-center gap-3 group w-full outline-none">
          <ZovaixLogo size="sm" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Menu
          </div>
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#F2F3FF] text-[#6D5EF8] font-semibold shadow-xs"
                    : "text-[#4B5563] hover:bg-[#F8F9FC] hover:text-[#111827]"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-[#6D5EF8]" : "text-[#9CA3AF]")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Account / Settings at Bottom */}
        <div className="pt-4 border-t border-[#E8EAF2] space-y-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#4B5563] hover:bg-[#F8F9FC] hover:text-[#111827]",
              location === "/settings" && "bg-[#F2F3FF] text-[#6D5EF8] font-semibold"
            )}
          >
            <Settings className="h-4 w-4 text-[#9CA3AF]" />
            <span>Settings</span>
          </Link>

          {user && (
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all text-left"
            >
              <LogOut className="h-4 w-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
