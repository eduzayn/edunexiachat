import { ReactNode, useState, useEffect } from "react";
import { SideNavigation } from "./side-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { EnvironmentBanner } from "./environment-banner";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEnvironment } from "@/hooks/use-environment";

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const environment = useEnvironment();
  
  // Inicializar estado da barra lateral a partir do localStorage ou como expandida por padrão
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const savedState = localStorage.getItem('sidebarExpanded');
    return savedState !== null ? savedState === 'true' : true;
  });
  
  // Salvar estado da barra lateral no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(sidebarExpanded));
  }, [sidebarExpanded]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);
  
  // Toggle sidebar expansion
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };
  
  // Ambiente sempre definido como produção agora
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Banner de ambiente removido para produção */}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <SideNavigation 
          className="hidden lg:flex" 
          expanded={sidebarExpanded}
          onToggle={toggleSidebar}
        />
        
        {/* Main Content */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 pl-4`}>
          {/* Mobile Header - visible only on mobile */}
          <header className="bg-white lg:hidden border-b border-gray-200 py-4 px-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">{title || "EduChat"}</h1>
          </header>
          
          {/* Content */}
          {children}
          
          {/* Mobile Navigation - visible only on mobile */}
          <MobileNavigation className="lg:hidden" />
        </div>
      </div>
    </div>
  );
}