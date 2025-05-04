import { useQuery } from "@tanstack/react-query";
import { Conversation, Contact, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSocketIO } from "@/hooks/use-socketio";
import { MessageDeliveryStatus, PresenceStatus } from "@/lib/socketio";

// Map channel type to icon and color
const channelIcons: Record<string, { icon: string; color: string }> = {
  whatsapp_twilio: { icon: "ri-whatsapp-line", color: "bg-green-500" },
  whatsapp_zap: { icon: "ri-whatsapp-line", color: "bg-green-500" },
  messenger: { icon: "ri-messenger-line", color: "bg-blue-500" },
  instagram: { icon: "ri-instagram-line", color: "bg-pink-500" },
  facebook: { icon: "ri-facebook-fill", color: "bg-blue-500" },
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ 
  conversation, 
  isActive, 
  onClick 
}: ConversationItemProps) {
  // Fetch contact info
  const { data: contact } = useQuery<Contact>({
    queryKey: [`/api/contacts/${conversation.contactId}`],
    enabled: !!conversation.contactId,
  });
  
  // Fetch last message if available
  const { data: lastMessage } = useQuery<Message>({
    queryKey: [
      `/api/conversations/${conversation.id}/messages`, 
      conversation.lastMessageId
    ],
    enabled: !!conversation.lastMessageId,
  });
  
  // Determine contact name, use identifier as fallback
  const contactName = contact?.name || conversation.contactIdentifier;
  
  // Format timestamp
  const timestamp = lastMessage?.createdAt 
    ? formatDistanceToNow(new Date(lastMessage.createdAt), { 
        addSuffix: false, 
        locale: ptBR 
      })
    : formatDistanceToNow(new Date(conversation.createdAt), { 
        addSuffix: false, 
        locale: ptBR 
      });
  
  // Get socket.io status
  const { messageStatuses, userPresence } = useSocketIO();
  
  // Get message status for last message
  const messageStatus = lastMessage?.id ? messageStatuses.get(lastMessage.id) : undefined;
  
  // Get contact presence status (if available)
  const contactPresence = contact?.id ? userPresence.get(contact.id) : undefined;
  
  // Get channel info
  const { data: channel } = useQuery({
    queryKey: [`/api/channels/${conversation.channelId}`],
    enabled: !!conversation.channelId,
  });
  
  // Determinar o tipo de canal com segurança
  let channelStyle = { 
    icon: "ri-question-line", 
    color: "bg-gray-500" 
  };
  
  if (channel) {
    // Use o tipo se disponível
    const channelType = (channel.type as string) || "";
    
    if (channelType.includes("whatsapp")) {
      channelStyle = channelIcons["whatsapp_twilio"];
    } else if (channelType.includes("messenger") || channelType.includes("facebook")) {
      channelStyle = channelIcons["messenger"];
    } else if (channelType.includes("instagram")) {
      channelStyle = channelIcons["instagram"];
    } else if (channelIcons[channelType]) {
      channelStyle = channelIcons[channelType];
    }
  }
  
  return (
    <div 
      className={`p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${isActive ? 'bg-blue-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {contact?.name ? (
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random&color=fff`} 
              className="h-12 w-12 rounded-full" 
              alt={contact.name} 
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium text-lg">
              {contactName.substring(0, 2).toUpperCase()}
            </div>
          )}
          {/* Canal de comunicação */}
          <span className={`channel-icon ${channelStyle.color} text-white`}>
            <i className={channelStyle.icon}></i>
          </span>
          
          {/* Indicador de presença */}
          {contactPresence && (
            <span 
              className={`absolute bottom-0 right-0 rounded-full h-3 w-3 border-2 border-white ${
                contactPresence.status === PresenceStatus.ONLINE 
                  ? 'bg-green-500' 
                  : contactPresence.status === PresenceStatus.AWAY 
                    ? 'bg-yellow-500' 
                    : 'bg-gray-500'
              }`}
              title={
                contactPresence.status === PresenceStatus.ONLINE 
                  ? 'Online' 
                  : contactPresence.status === PresenceStatus.AWAY 
                    ? 'Ausente' 
                    : 'Offline'
              }
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900 truncate">{contactName}</h3>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          
          <p className="text-sm text-gray-600 truncate mt-1">
            {lastMessage?.content || "Nova conversa"}
          </p>
          
          <div className="mt-1 flex items-center justify-between">
            {conversation.assignedTo ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <i className="ri-user-line mr-1 text-xs"></i> Você
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                <i className="ri-timer-line mr-1 text-xs"></i> Aguardando
              </Badge>
            )}
            
            {/* Unread indicator or message status */}
            {lastMessage?.direction === "inbound" ? (
              <Badge className="bg-primary-500 text-white rounded-full h-5 min-w-5 flex items-center justify-center">
                1
              </Badge>
            ) : messageStatus ? (
              <span className="flex items-center text-primary-500 text-xs">
                {messageStatus.status === MessageDeliveryStatus.READ ? (
                  <>
                    <i className="ri-check-double-line mr-0.5"></i> Lida
                  </>
                ) : messageStatus.status === MessageDeliveryStatus.DELIVERED ? (
                  <>
                    <i className="ri-check-double-line mr-0.5"></i> Entregue
                  </>
                ) : (
                  <>
                    <i className="ri-check-line mr-0.5"></i> Enviada
                  </>
                )}
              </span>
            ) : (
              <span className="flex items-center text-primary-500 text-xs">
                <i className="ri-check-line mr-0.5"></i> Enviada
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
