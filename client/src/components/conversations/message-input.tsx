import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SmilePlus, Paperclip, FileText, Timer, DollarSign, CheckCircle } from "lucide-react";
import { useSocketIO } from "@/hooks/use-socketio";
import { useAuth } from "@/hooks/use-auth";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  conversationId: number;
}

export function MessageInput({ onSendMessage, conversationId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { startTyping, stopTyping } = useSocketIO();
  const { user } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);
  
  // Limpar timeout de digitação quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Notificar que parou de digitar ao desmontar o componente
      if (isTyping) {
        stopTyping(conversationId);
      }
    };
  }, [isTyping, conversationId, stopTyping]);
  
  // Função para gerenciar o estado de digitação
  const handleTypingStatus = (typing: boolean) => {
    if (typing && !isTyping) {
      // Usuário começou a digitar
      setIsTyping(true);
      startTyping(conversationId, user?.name);
    } else if (!typing && isTyping) {
      // Usuário parou de digitar
      setIsTyping(false);
      stopTyping(conversationId);
    }
    
    // Resetar o timeout de digitação
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (typing) {
      // Agendar um timeout para indicar que parou de digitar
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(conversationId);
      }, 3000); // 3 segundos de inatividade = parou de digitar
    }
  };
  
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // Atualiza o status de digitação
    handleTypingStatus(newMessage.length > 0);
  };
  
  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Notificar que parou de digitar
      handleTypingStatus(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="p-3 bg-white border-t border-gray-200">
      <div className="flex items-end gap-2">
        <div className="flex items-center space-x-1 text-gray-500">
          <Button variant="ghost" size="icon" type="button">
            <SmilePlus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" type="button">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" type="button">
            <FileText className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[42px] resize-none p-2"
            rows={1}
          />
        </div>
        
        <Button 
          className="ml-2 bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center"
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </Button>
      </div>
      
      <div className="flex mt-2 text-sm text-gray-500 items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="h-auto p-0">
            <Timer className="h-4 w-4 mr-1" />
            <span>Agendar</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="h-auto p-0">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>Pagamento</span>
          </Button>
          
          <div className="hidden lg:flex items-center text-gray-400 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            <span>Sugestões de resposta ativadas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
