import { 
  Home, 
  Users, 
  BarChart2, 
  Settings, 
  Briefcase, 
  MessageSquare, 
  Database, 
  GitBranch, 
  Bot, 
  FileText, 
  Award,
  MessagesSquare
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Importar sistema de tradução
import { t } from "@/lib/translations";

interface MobileNavigationProps {
  className?: string;
}

export function MobileNavigation({ className = "" }: MobileNavigationProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  // Navigation items config - versão simplificada para mobile com traduções consistentes
  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" }, // Mantendo "Dashboard" conforme produção
    { path: "/inbox", icon: MessageSquare, label: t("Inbox") },
    { path: "/contacts", icon: Users, label: t("Contacts") },
    { path: "/automations", icon: Bot, label: t("Automations") },
    { path: "/analytics", icon: BarChart2, label: t("Analytics") },
    { path: "/settings", icon: Settings, label: t("Settings") }
  ];
  
  // Check which navigation item is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };
  
  return (
    <div className={cn("fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between z-10", className)}>
      {navItems.map(({ path, icon: Icon, label }) => (
        <button 
          key={path}
          className={cn(
            "flex flex-col items-center py-2 px-1 flex-1", 
            isActive(path) ? "text-primary" : "text-gray-500"
          )}
          onClick={() => navigate(path)}
          aria-label={label}
        >
          <Icon className="h-5 w-5" />
          <span className="text-xs mt-1 truncate w-full text-center">{label}</span>
        </button>
      ))}
    </div>
  );
}
