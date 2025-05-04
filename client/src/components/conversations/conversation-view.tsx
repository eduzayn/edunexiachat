import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Conversation, Message, Contact } from "@shared/schema";
import { useSocketIO } from "@/hooks/use-socketio";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { ArrowLeft, Phone, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Group messages by date
function groupMessagesByDate(messages: Message[]) {
  const grouped: Record<string, Message[]> = {};
  
  messages.forEach(message => {
    const date = new Date(message.createdAt);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(message);
  });
  
  return grouped;
}

interface ConversationViewProps {
  conversationId: number;
  onBack: () => void;
  onToggleContactPanel: () => void;
  className?: string;
}

export function ConversationView({
  conversationId,
  onBack,
  onToggleContactPanel,
  className = ""
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { lastEvent, typingUsers, userPresence } = useSocketIO();
  
  // Fetch conversation data
  const { data, isLoading } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: !!conversationId,
  });
  
  // Fetch contact data
  const { data: contact } = useQuery<Contact>({
    queryKey: [`/api/contacts/${data?.conversation.contactId}`],
    enabled: !!data?.conversation.contactId,
  });
  
  // Get channel data
  const { data: channel } = useQuery({
    queryKey: [`/api/channels/${data?.conversation.channelId}`],
    enabled: !!data?.conversation.channelId,
  });
  
  // Get users typing in this conversation
  const activeTypers = typingUsers.get(conversationId) || [];
  
  // Get contact presence if available
  const contactPresence = contact?.id ? userPresence.get(contact.id) : undefined;
  
  // Handle websocket events - update messages when new messages arrive
  useEffect(() => {
    if (lastEvent && lastEvent.type === "message_created" && 
        lastEvent.data.conversationId === conversationId) {
      // Update the conversation messages
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${conversationId}`] 
      });
    }
  }, [lastEvent, conversationId]);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);
  
  // Handle message send
  const handleSendMessage = async (content: string) => {
    try {
      await apiRequest(`/api/conversations/${conversationId}/messages`, {
        method: "POST", 
        data: {
          content,
          contentType: "text"
        }
      });
      
      // Message will be added via websocket event and UI will update
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  // Função para selecionar uma sugestão
  const handleSelectSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion);
  };
  
  if (isLoading) {
    return (
      <div className={`flex flex-col flex-1 items-center justify-center bg-gray-50 ${className}`}>
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className={`flex flex-col flex-1 items-center justify-center bg-gray-50 ${className}`}>
        <p className="text-gray-500">Conversa não encontrada</p>
      </div>
    );
  }
  
  const { conversation, messages } = data;
  const contactName = contact?.name || conversation.contactIdentifier;
  
  // Definir nome e ícone do canal com base no channelId
  let channelName = "Canal";
  let channelIcon = "ri-chat-3-line";
  
  if (channel) {
    // Se o canal existe, definir nome
    const channelConfig = channel.config as Record<string, any> || {};
    channelName = (channelConfig.name as string) || channel.name as string || "Canal";
    
    // Definir ícone baseado no tipo do canal
    const channelType = channel.type?.toString() || "";
    if (channelType.includes("whatsapp")) {
      channelIcon = "ri-whatsapp-line";
    } else if (channelType.includes("messenger") || channelType.includes("facebook")) {
      channelIcon = "ri-messenger-line";
    } else if (channelType.includes("instagram")) {
      channelIcon = "ri-instagram-line";
    } else if (channelType.includes("telegram")) {
      channelIcon = "ri-telegram-line";
    } else if (channelType.includes("slack")) {
      channelIcon = "ri-slack-line";
    } else if (channelType.includes("email")) {
      channelIcon = "ri-mail-line";
    }
  }
  
  const groupedMessages = groupMessagesByDate(messages);
  
  return (
    <div className={`flex flex-col flex-1 bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2" 
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="relative mr-3">
            {contact?.name ? (
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random&color=fff`} 
                className="h-10 w-10 rounded-full" 
                alt={contact.name} 
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                {contactName.substring(0, 2).toUpperCase()}
              </div>
            )}
            
            {/* Indicador de status */}
            {contactPresence && (
              <span 
                className={`absolute bottom-0 right-0 rounded-full h-3 w-3 border-2 border-white ${
                  contactPresence.status === "online" 
                    ? 'bg-green-500' 
                    : contactPresence.status === "away" 
                      ? 'bg-yellow-500' 
                      : 'bg-gray-500'
                }`}
              />
            )}
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-900">{contactName}</h2>
            <div className="flex items-center text-sm text-gray-500">
              <i className={`${channelIcon} mr-1`}></i>
              <span>{channelName} • {contactPresence?.status === "online" ? "Online" : 
                                    contactPresence?.status === "away" ? "Ausente" : 
                                    "Offline"}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Search className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 md:hidden"
            onClick={onToggleContactPanel}
          >
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {/* Message Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            {/* Day Divider */}
            <div className="flex items-center justify-center my-4">
              <span className="px-4 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                {format(new Date(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            
            {/* Day's Messages */}
            {dayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOutbound={message.direction === "outbound"}
                onSelectSuggestion={handleSelectSuggestion}
                conversationId={conversationId}
              />
            ))}
          </div>
        ))}
        
        {/* Typing indicator */}
        {activeTypers.length > 0 && (
          <div className="flex items-center my-2">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex space-x-1 mb-1">
                <div className="bg-gray-300 rounded-full h-2 w-2 animate-pulse"></div>
                <div className="bg-gray-300 rounded-full h-2 w-2 animate-pulse delay-100"></div>
                <div className="bg-gray-300 rounded-full h-2 w-2 animate-pulse delay-200"></div>
              </div>
              <div className="text-xs text-gray-500">
                {activeTypers.length === 1 
                  ? `${activeTypers[0].displayName} está digitando...` 
                  : `${activeTypers.length} pessoas estão digitando...`}
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input Area */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        conversationId={conversationId} 
      />
    </div>
  );
}
