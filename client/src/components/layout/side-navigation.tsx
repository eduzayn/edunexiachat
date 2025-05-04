import { 
  Home, 
  Users, 
  BarChart2, 
  Settings, 
  Briefcase, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  LogOut, 
  Database, 
  GitBranch, 
  Bot, 
  FileText, 
  Award, 
  Save,
  MessagesSquare,
  LayoutDashboard,
  BarChart,
  Gauge,
  LineChart
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Importar sistema de tradução
import { t } from "@/lib/translations";

interface SideNavigationProps {
  className?: string;
  expanded?: boolean;
  onToggle?: () => void;
}

export function SideNavigation({ className = "", expanded = false, onToggle }: SideNavigationProps) {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  
  // Categorias de navegação - com sistema de tradução
  const navCategories = [
    {
      name: t("Main"),
      icon: LayoutDashboard,
      items: [
        { path: "/", icon: Home, label: "Dashboard" }, // Mantendo "Dashboard" conforme produção
        { path: "/inbox", icon: MessageSquare, label: t("Inbox") },
        { path: "/conversations", icon: MessagesSquare, label: t("Conversations") },
      ]
    },
    {
      name: t("Management"),
      icon: MessagesSquare,
      items: [
        { path: "/contacts", icon: Users, label: t("Contacts") },
        { path: "/crm", icon: Briefcase, label: "CRM" }, // Mantendo "CRM" conforme produção
        { path: "/automations", icon: Bot, label: t("Automations") },
        { path: "/templates", icon: FileText, label: t("Templates") },
        { path: "/routing-rules", icon: GitBranch, label: t("Routing Rules") },
      ]
    },
    {
      name: t("Reports"),
      icon: LineChart,
      items: [
        { path: "/metrics", icon: Award, label: t("Metrics") },
        { path: "/analytics", icon: BarChart2, label: t("Analytics") },
      ]
    },
    {
      name: t("System"),
      icon: Gauge,
      items: [
        { path: "/users", icon: Users, label: t("Users") },
        { path: "/webhook-queue", icon: Database, label: t("Webhooks") },
        { path: "/settings", icon: Settings, label: t("Settings"), showIcon: true },
        ...(user?.role === "admin" ? [
          { path: "/admin/cache", icon: Database, label: t("Cache Admin") },
          { path: "/admin/backups", icon: Save, label: t("Backups") }
        ] : [])
      ]
    }
  ];
  
  // Todos os itens de navegação para checagem de rota ativa (mantém compatibilidade com verificação de rota ativa)
  const navItems = navCategories.flatMap(category => category.items);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  // Check which navigation item is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };
  
  // Navigate to a given path without toggling the sidebar
  const handleNavigation = (path: string) => {
    // Apenas navega para a rota, sem afetar o estado da barra lateral
    navigate(path);
  };
  
  // Handle user profile click or logout
  const handleProfileClick = () => {
    // For now, just show a simple logout confirmation
    if (confirm("Deseja sair da sua conta?")) {
      logoutMutation.mutate();
    }
  };
  
  return (
    <div 
      className={cn("flex-col bg-gray-800 text-white flex-shrink-0 transition-all duration-300", 
        expanded ? 'w-64' : 'w-16',
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo and toggle */}
        <div className="p-3 flex items-center justify-between">
          <div className="bg-primary-500 h-10 w-10 rounded-full flex items-center justify-center font-bold text-white">
            EC
          </div>
          
          {expanded && (
            <div className="flex-1 ml-3 text-base font-semibold">EduChat</div>
          )}
          
          {!isMobile && (
            <button 
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={onToggle}
              aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            >
              {expanded ? <ChevronLeft size={16} /> : <Menu size={16} />}
            </button>
          )}
        </div>
        
        {/* Navigation Categories and Items */}
        <nav className="flex-1 px-2 py-4 space-y-6">
          {navCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-2">
              {/* Category Header - Visible only when expanded */}
              {expanded && (
                <div className="pl-3 pr-2">
                  <div className="flex items-center">
                    <category.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium tracking-wider text-gray-400 uppercase ml-2">
                      {category.name}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Category Items */}
              <div className="space-y-1">
                {category.items.map(({ path, icon: Icon, label, showIcon }) => (
                  expanded ? (
                    <button 
                      key={path}
                      className={cn(
                        "w-full p-2.5 flex items-center rounded-lg transition",
                        isActive(path) 
                          ? "bg-gray-700 text-white" 
                          : "text-gray-400 hover:bg-gray-700"
                      )}
                      onClick={() => handleNavigation(path)}
                      aria-label={label}
                    >
                      {showIcon ? (
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm">{label}</span>
                        </div>
                      ) : (
                        <span className="ml-8 text-sm">{label}</span>
                      )}
                    </button>
                  ) : (
                    <TooltipProvider key={path}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            className={cn(
                              "w-full p-3 flex justify-center items-center rounded-lg transition",
                              isActive(path) 
                                ? "bg-gray-700 text-white" 
                                : "text-gray-400 hover:bg-gray-700"
                            )}
                            onClick={() => handleNavigation(path)}
                            aria-label={label}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        {/* User Profile */}
        <div className="p-3 flex items-center">
          <button className="relative" onClick={handleProfileClick} aria-label="Perfil do usuário">
            {user?.name ? (
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`} 
                className="h-10 w-10 rounded-full border-2 border-gray-700" 
                alt={`${user.name}'s profile`} 
              />
            ) : (
              <div className="h-10 w-10 rounded-full border-2 border-gray-700 bg-gray-600 flex items-center justify-center text-white font-medium">
                {user?.username?.substring(0, 2).toUpperCase() || "U"}
              </div>
            )}
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
          </button>
          
          {expanded ? (
            <div className="ml-3 flex-1 truncate">
              <div className="font-medium text-sm">{user?.name || user?.username}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Online</span>
              </div>
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="sr-only">Perfil</span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user?.name || user?.username} - Online
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
