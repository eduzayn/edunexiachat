import { Message } from "@shared/schema";
import { format } from "date-fns";
import { DollarSign, Check, CheckCheck } from "lucide-react";
import { useSocketIO } from "@/hooks/use-socketio";
import { MessageDeliveryStatus } from "@/lib/socketio";
import { useEffect, useState } from "react";
import { ResponseSuggestions } from "./response-suggestions";

interface MessageBubbleProps {
  message: Message;
  isOutbound: boolean;
  onSelectSuggestion?: (suggestion: string) => void;
  conversationId: number;
}

export function MessageBubble({ 
  message, 
  isOutbound, 
  onSelectSuggestion,
  conversationId
}: MessageBubbleProps) {
  const timestamp = format(new Date(message.createdAt), "HH:mm");
  const { messageStatuses, markMessageAsDelivered, markMessageAsRead } = useSocketIO();
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Obter o status atual da mensagem
  const messageStatus = messageStatuses.get(message.id);
  const deliveryStatus = messageStatus?.status || MessageDeliveryStatus.SENT;
  
  // Marcar mensagens recebidas como entregues e lidas
  useEffect(() => {
    if (!isOutbound && message.id) {
      // Se é uma mensagem recebida, marcar como entregue
      markMessageAsDelivered(message.id);
      
      // Aguardar um curto período para marcar como lida (simulando tempo de leitura)
      const timeout = setTimeout(() => {
        markMessageAsRead(message.id);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [message.id, isOutbound, markMessageAsDelivered, markMessageAsRead]);
  
  // Detect if the message contains a payment request
  const hasPaymentRequest = message.content.includes("plano") && 
                            message.content.includes("R$") && 
                            isOutbound;
  
  return (
    <div className={`flex items-end ${isOutbound ? "justify-end max-w-xs md:max-w-md lg:max-w-lg ml-auto" : "max-w-xs md:max-w-md lg:max-w-lg"}`}>
      <div className={`rounded-lg p-3 shadow-sm ${isOutbound ? "bg-primary-500 text-white" : "bg-white"}`}>
        <p>{message.content}</p>
        
        {/* Payment info card (if detected) */}
        {hasPaymentRequest && (
          <div className="mt-3 bg-white p-3 rounded-md text-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Plano Educacional Plus</span>
              <span className="font-bold">R$ 499,00</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Acesso completo para até 250 alunos</p>
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded transition flex items-center justify-center">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>Ver detalhes do plano</span>
            </button>
          </div>
        )}
        
        {/* Message timestamp and delivery status */}
        <div className={`flex items-center justify-between mt-1 text-xs ${isOutbound ? "text-primary-100" : "text-gray-500"}`}>
          {/* Sugestões de resposta (apenas para mensagens recebidas) */}
          {!isOutbound && onSelectSuggestion && (
            <div className="relative">
              <ResponseSuggestions
                messageId={message.id}
                conversationId={conversationId}
                onSelectSuggestion={onSelectSuggestion}
              />
            </div>
          )}
          
          <div className="flex items-center ml-auto">
            <span>{timestamp}</span>
            {isOutbound && (
              <span className="ml-1">
                {deliveryStatus === MessageDeliveryStatus.READ ? (
                  <CheckCheck className="h-4 w-4" />
                ) : deliveryStatus === MessageDeliveryStatus.DELIVERED ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4 opacity-70" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
