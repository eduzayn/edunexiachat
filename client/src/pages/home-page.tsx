import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SocketIOProvider } from "@/hooks/use-socketio";
import { apiRequest } from "@/lib/queryClient";
import { Conversation } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";
import { ConversationList } from "@/components/conversations/conversation-list";
import { ConversationView } from "@/components/conversations/conversation-view";
import { ContactPanel } from "@/components/contacts/contact-panel";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function HomePage() {
  const isMobile = useIsMobile();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [showContactPanel, setShowContactPanel] = useState(!isMobile);
  
  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      return res.json();
    },
  });
  
  // Hide contact panel on mobile by default
  useEffect(() => {
    setShowContactPanel(!isMobile);
  }, [isMobile]);
  
  // Handle mobile conversation view
  const handleSelectConversation = (conversationId: number) => {
    setActiveConversation(conversationId);
  };
  
  const handleCloseConversation = () => {
    setActiveConversation(null);
  };
  
  const toggleContactPanel = () => {
    setShowContactPanel(!showContactPanel);
  };
  
  return (
    <SocketIOProvider>
      <AppShell title="Dashboard">
        
        {/* Conversation List Panel */}
        <ConversationList
          conversations={conversations || []}
          loading={conversationsLoading}
          activeConversationId={activeConversation}
          onSelectConversation={handleSelectConversation}
          className={`${isMobile && activeConversation ? 'hidden' : 'flex'} md:flex`}
        />
        
        {/* Main Conversation View */}
        {activeConversation ? (
          <ConversationView
            conversationId={activeConversation}
            onBack={handleCloseConversation}
            onToggleContactPanel={toggleContactPanel}
            className={`${isMobile && !activeConversation ? 'hidden' : 'flex'} md:flex`}
          />
        ) : (
          <div className="hidden md:flex flex-col flex-1 items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <div className="bg-primary-100 text-primary-500 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecione uma conversa</h2>
              <p className="text-gray-600">Escolha uma conversa da lista para começar a enviar mensagens</p>
            </div>
          </div>
        )}
        
        {/* Contact Details Panel - Only visible on larger screens or when toggled */}
        {showContactPanel && activeConversation && (
          <ContactPanel
            conversationId={activeConversation}
            onClose={() => setShowContactPanel(false)}
          />
        )}
        

      </AppShell>
    </SocketIOProvider>
  );
}
