import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, Message, Channel, User, Contact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AppShell } from "@/components/layout/app-shell";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { WebSocketClient } from "@/lib/websocket";

// Componentes de UI
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Ícones
import {
  Search,
  MessageSquare,
  MoreVertical,
  User as UserIcon,
  Send,
  Plus,
  ChevronDown,
  Check,
  X,
  Clock,
  Filter,
  Phone,
  Mail,
  MessageCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// Função para formatar data em português
const formatDate = (date: Date | string | null) => {
  if (!date) return "";
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  const options: Intl.DateTimeFormatOptions = { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric"
  };
  return dateObj.toLocaleDateString("pt-BR", options);
};

// Componente para mostrar a lista de conversas
interface ConversationItemProps {
  conversation: Conversation & { 
    contact?: { name: string; source: string; identifier: string; }, 
    lastMessage?: { content: string; createdAt: Date; direction: string; }
  };
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const contactName = conversation.contact?.name || conversation.contactIdentifier;
  const channelIcon = getChannelIcon(conversation.contact?.source || "");
  
  return (
    <div 
      className={`p-4 border-b cursor-pointer transition-colors ${
        isActive ? "bg-primary-50 border-l-4 border-l-primary" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="" alt={contactName} />
          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-purple-600 text-white">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium truncate">{contactName}</p>
            <p className="text-xs text-muted-foreground">
              {conversation.lastMessage ? formatDate(conversation.lastMessage.createdAt) : ""}
            </p>
          </div>
          <div className="flex items-center mt-1">
            {channelIcon}
            <p className="text-xs text-muted-foreground truncate ml-1">
              {conversation.lastMessage?.content || "Sem mensagens"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <Badge variant={getStatusVariant(conversation.status)}>
          {translateStatus(conversation.status)}
        </Badge>
        {conversation.assignedTo ? (
          <div className="flex items-center">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">A</div>
            <span className="text-xs ml-1">Atribuído</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Componente para mostrar mensagens individuais
interface MessageItemProps {
  message: Message;
  isLastMessage: boolean;
}

function MessageItem({ message, isLastMessage }: MessageItemProps) {
  const isOutbound = message.direction === "outbound";
  
  return (
    <div 
      className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-4`}
      id={isLastMessage ? "last-message" : undefined}
    >
      <div 
        className={`max-w-[70%] rounded-lg p-3 ${
          isOutbound 
            ? "bg-primary text-white rounded-br-none" 
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <div className={`text-xs mt-1 ${isOutbound ? "text-primary-100" : "text-gray-500"}`}>
          {formatDate(message.createdAt)}
          {message.status && (
            <span className="ml-2">
              {message.status === "sent" && <Check className="inline h-3 w-3" />}
              {message.status === "delivered" && <Check className="inline h-3 w-3" />}
              {message.status === "read" && <Check className="inline h-3 w-3" />}
              {message.status === "failed" && <AlertCircle className="inline h-3 w-3" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para o painel de detalhes do contato
interface ContactDetailsPanelProps {
  contact: any;
  onClose: () => void;
}

function ContactDetailsPanel({ contact, onClose }: ContactDetailsPanelProps) {
  if (!contact) return null;
  
  return (
    <div className="h-full flex flex-col border-l">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-medium">Detalhes do Contato</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <div className="flex flex-col items-center mb-6">
          <Avatar className="h-20 w-20 mb-3">
            <AvatarFallback className="text-xl bg-gradient-to-r from-purple-400 to-purple-600 text-white">
              {getInitials(contact.name || contact.identifier)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-medium text-lg">{contact.name || "Sem nome"}</h3>
          <p className="text-sm text-muted-foreground">{contact.identifier}</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Informações Básicas</h4>
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Canal</span>
                  <span className="text-sm font-medium">
                    {translateChannel(contact.source)}
                  </span>
                </div>
                {contact.email && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Telefone</span>
                    <span className="text-sm font-medium">{contact.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={contact.leadStage === "qualificado" ? "default" : "outline"} 
                    className={contact.leadStage === "qualificado" ? "bg-green-100 text-green-800" : ""}>
                    {translateLeadStage(contact.leadStage)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {contact.tags && contact.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium mb-2">Lead</h4>
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pontuação (0-10)</span>
                  <span className="text-sm font-medium">{contact.leadScore || 0}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estágio</span>
                  <span className="text-sm font-medium">{translateLeadStage(contact.leadStage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Criado em</span>
                  <span className="text-sm font-medium">{formatDate(contact.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" size="sm" className="w-full">
              Editar Contato
            </Button>
            <Button variant="outline" size="sm" className="w-full ml-2">
              Ver Negociações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funções utilitárias
function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getChannelIcon(channelType: string) {
  switch (channelType.toLowerCase()) {
    case "whatsapp":
      return <MessageCircle className="h-3 w-3 text-green-500" />;
    case "messenger":
      return <MessageCircle className="h-3 w-3 text-blue-500" />;
    case "instagram":
      return <MessageCircle className="h-3 w-3 text-pink-500" />;
    case "email":
      return <Mail className="h-3 w-3 text-gray-500" />;
    case "sms":
      return <MessageSquare className="h-3 w-3 text-gray-500" />;
    case "telegram":
      return <MessageCircle className="h-3 w-3 text-blue-400" />;
    case "slack":
      return <MessageCircle className="h-3 w-3 text-purple-500" />;
    case "discord":
      return <MessageCircle className="h-3 w-3 text-indigo-500" />;
    default:
      return <MessageSquare className="h-3 w-3 text-gray-500" />;
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "open":
      return "default";
    case "pending":
      return "outline";
    case "resolved":
      return "outline";
    default:
      return "outline";
  }
}

function translateStatus(status: string) {
  switch (status) {
    case "open":
      return "Aberta";
    case "pending":
      return "Pendente";
    case "resolved":
      return "Resolvida";
    default:
      return status;
  }
}

function translateChannel(channelType: string) {
  const channels: {[key: string]: string} = {
    "whatsapp": "WhatsApp",
    "messenger": "Messenger",
    "instagram": "Instagram",
    "email": "Email",
    "sms": "SMS",
    "telegram": "Telegram",
    "slack": "Slack",
    "discord": "Discord"
  };
  
  return channels[channelType.toLowerCase()] || channelType;
}

function translateLeadStage(stage: string | null | undefined) {
  if (!stage) return "Novo";
  
  const stages: {[key: string]: string} = {
    "novo": "Novo",
    "qualificado": "Qualificado",
    "desqualificado": "Desqualificado",
    "inicial": "Inicial",
    "oportunidade": "Oportunidade",
    "proposta": "Proposta",
    "negociação": "Negociação"
  };
  
  return stages[stage.toLowerCase()] || stage;
}

// Componente principal para a página Inbox
export default function InboxPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [filter, setFilter] = useState<string>("open");
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isNewContact, setIsNewContact] = useState(false);
  
  // Estados para o modal de nova conversa
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  
  // Buscar conversas
  const { 
    data: conversations, 
    isLoading: conversationsLoading,
    refetch: refetchConversations
  } = useQuery<(Conversation & { 
    contact?: { name: string; source: string; identifier: string; }, 
    lastMessage?: { content: string; createdAt: Date; direction: string; }
  })[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      if (!res.ok) {
        throw new Error("Falha ao carregar conversas");
      }
      
      // Após obter as conversas, buscar detalhes adicionais
      const conversations = await res.json();
      
      // Para cada conversa, buscar o contato associado
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conversation: Conversation) => {
          try {
            // Buscar o contato
            const contactRes = await apiRequest("GET", `/api/contacts/${conversation.contactId}`);
            const contact = contactRes.ok ? await contactRes.json() : null;
            
            // Buscar a última mensagem da conversa
            const messagesRes = await apiRequest("GET", `/api/conversations/${conversation.id}/messages?limit=1`);
            const messages = messagesRes.ok ? await messagesRes.json() : [];
            const lastMessage = messages.length > 0 ? messages[0] : null;
            
            return {
              ...conversation,
              contact,
              lastMessage
            };
          } catch (error) {
            console.error("Erro ao buscar detalhes da conversa:", error);
            return conversation;
          }
        })
      );
      
      return conversationsWithDetails;
    },
  });
  
  // Buscar mensagens da conversa selecionada
  const { 
    data: messages, 
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      
      const res = await apiRequest("GET", `/api/conversations/${selectedConversationId}/messages`);
      if (!res.ok) {
        throw new Error("Falha ao carregar mensagens");
      }
      return res.json();
    },
    enabled: !!selectedConversationId,
  });
  
  // Buscar detalhes do contato da conversa selecionada
  const {
    data: selectedContact,
    isLoading: contactLoading
  } = useQuery({
    queryKey: ["/api/contacts", selectedConversationId],
    queryFn: async () => {
      const conversation = conversations?.find(c => c.id === selectedConversationId);
      if (!conversation) return null;
      
      const res = await apiRequest("GET", `/api/contacts/${conversation.contactId}`);
      if (!res.ok) {
        throw new Error("Falha ao carregar detalhes do contato");
      }
      return res.json();
    },
    enabled: !!selectedConversationId,
  });
  
  // Buscar lista de contatos para o modal de nova conversa
  const { 
    data: contacts, 
    isLoading: contactsLoading 
  } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/contacts");
      if (!res.ok) {
        throw new Error("Falha ao carregar contatos");
      }
      return res.json();
    }
  });
  
  // Buscar lista de canais disponíveis
  const { 
    data: channels, 
    isLoading: channelsLoading 
  } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      if (!res.ok) {
        throw new Error("Falha ao carregar canais");
      }
      return res.json();
    }
  });
  
  // Filtrar conversas
  const filteredConversations = conversations?.filter(conversation => {
    // Filtrar por status
    if (conversation.status !== filter) {
      return false;
    }
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const contactName = conversation.contact?.name || "";
      const contactIdentifier = conversation.contactIdentifier || "";
      const searchLower = searchTerm.toLowerCase();
      return (
        contactName.toLowerCase().includes(searchLower) ||
        contactIdentifier.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  // Enviar mensagem
  // Função para atualizar o status da conversa
  const updateConversationStatus = async (status: string) => {
    if (!selectedConversationId) return;
    
    try {
      setIsSending(true);
      const res = await apiRequest(
        "PATCH", 
        `/api/conversations/${selectedConversationId}`, 
        { status }
      );
      
      if (!res.ok) {
        throw new Error("Falha ao atualizar status da conversa");
      }
      
      // Atualizar os dados locais
      await refetchConversations();
      
      toast({
        title: "Status atualizado",
        description: `Conversa marcada como ${translateStatus(status).toLowerCase()}`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao atualizar status",
        description: error instanceof Error ? error.message : "Ocorreu um erro",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Função para atribuir a conversa ao usuário atual
  const assignConversationToMe = async () => {
    if (!selectedConversationId) return;
    
    try {
      setIsSending(true);
      const res = await apiRequest(
        "POST", 
        `/api/conversations/${selectedConversationId}/assign`, 
        {}
      );
      
      if (!res.ok) {
        throw new Error("Falha ao atribuir conversa");
      }
      
      // Atualizar os dados locais
      await refetchConversations();
      
      toast({
        title: "Conversa atribuída",
        description: "Esta conversa foi atribuída a você",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao atribuir conversa",
        description: error instanceof Error ? error.message : "Ocorreu um erro",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Referência para o WebSocket
  const wsRef = useRef<WebSocketClient | null>(null);
  
  // Conectar ao WebSocket quando a página é carregada
  useEffect(() => {
    // Inicializar WebSocket
    wsRef.current = new WebSocketClient({
      userId: null, // Será atualizado quando o usuário estiver autenticado
      onMessage: handleWebSocketMessage,
    });
    
    // Conectar ao servidor WebSocket
    wsRef.current.connect();
    
    // Limpar a conexão quando o componente for desmontado
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);
  
  // Manipular mensagens recebidas via WebSocket
  const handleWebSocketMessage = (event: any) => {
    console.log("WebSocket message received:", event);
    
    // Atualizar a UI com base no tipo de evento
    switch (event.type) {
      case "message_created":
        // Atualizar mensagens se a conversa atual é a que recebeu a mensagem
        if (selectedConversationId === event.data.conversationId) {
          refetchMessages();
        }
        // Sempre atualizar a lista de conversas para mostrar as mais recentes no topo
        refetchConversations();
        break;
        
      case "conversation_updated":
      case "conversation_assigned":
        // Atualizar lista de conversas quando qualquer conversa é atualizada
        refetchConversations();
        break;
        
      case "contact_updated":
        // Atualizar detalhes do contato se o contato atual foi atualizado
        if (selectedContact && selectedContact.id === event.data.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/contacts", selectedConversationId] });
        }
        break;
        
      default:
        // Ignorar outros tipos de eventos
        break;
    }
  };
  
  // Rolar para a última mensagem quando as mensagens são carregadas ou atualizadas
  useEffect(() => {
    if (messages?.length) {
      const lastMessage = document.getElementById("last-message");
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedConversationId) return;
    
    setIsSending(true);
    try {
      const res = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, {
        content: messageContent,
        contentType: "text",
        direction: "outbound"
      });
      
      if (!res.ok) {
        throw new Error("Falha ao enviar mensagem");
      }
      
      // Limpar o campo de texto e recarregar mensagens
      setMessageContent("");
      await refetchMessages();
      await refetchConversations();
      
      // Mostrar toast de sucesso
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  

  
  // Componente de layout principal
  return (
    <AppShell title="Caixa de Entrada">
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b border-gray-200 py-4 px-6 hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-800">Caixa de Entrada</h1>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Lista de Conversas */}
          <div className="w-full md:w-1/3 xl:w-1/4 flex flex-col border-r">
            {/* Cabeçalho e filtros */}
            <div className="p-4 border-b">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar conversas..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="w-full">
                  <TabsTrigger value="open" className="flex-1">
                    Abertas 
                    {Array.isArray(conversations) && (
                      <Badge variant="secondary" className="ml-1.5 text-xs">
                        {conversations.filter(c => c.status === "open").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1">
                    Pendentes
                    {Array.isArray(conversations) && (
                      <Badge variant="secondary" className="ml-1.5 text-xs">
                        {conversations.filter(c => c.status === "pending").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="flex-1">
                    Resolvidas
                    {Array.isArray(conversations) && (
                      <Badge variant="secondary" className="ml-1.5 text-xs">
                        {conversations.filter(c => c.status === "resolved").length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Lista de Conversas */}
            <div className="flex-1 overflow-auto">
              {conversationsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 border-b">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma conversa encontrada</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {searchTerm
                      ? "Tente modificar os termos da busca."
                      : "Ainda não há conversas nesta categoria."}
                  </p>
                  <Button onClick={() => setIsNewConversationOpen(true)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Nova Conversa
                  </Button>
                </div>
              ) : (
                filteredConversations?.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={selectedConversationId === conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  />
                ))
              )}
            </div>
          </div>
          
          {/* Área de Mensagens e Detalhes do Contato */}
          <div className="hidden md:flex flex-1 flex-col">
            {selectedConversationId ? (
              <div className="flex flex-1 overflow-hidden">
                {/* Área de Mensagens */}
                <div className={`flex flex-col flex-1 ${showContactDetails ? "md:w-2/3" : "w-full"}`}>
                  {/* Cabeçalho da conversa */}
                  <div className="flex justify-between items-center p-4 border-b">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-purple-600 text-white">
                          {getInitials(selectedContact?.name || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{selectedContact?.name || "Carregando..."}</h3>
                        <div className="flex items-center">
                          {selectedContact && getChannelIcon(selectedContact.source)}
                          <span className="text-xs text-muted-foreground ml-1">
                            {selectedContact?.source
                              ? translateChannel(selectedContact.source)
                              : "Carregando..."}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowContactDetails(!showContactDetails)}
                        className="text-xs"
                      >
                        {showContactDetails ? "Ocultar Detalhes" : "Detalhes do Contato"}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={assignConversationToMe}>
                            <UserIcon className="mr-2 h-4 w-4" />
                            Atribuir a mim
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateConversationStatus("open")}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Marcar como aberta
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateConversationStatus("pending")}>
                            <Clock className="mr-2 h-4 w-4" />
                            Marcar como pendente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateConversationStatus("resolved")}>
                            <Check className="mr-2 h-4 w-4" />
                            Marcar como resolvida
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Área de mensagens */}
                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-lg p-3 ${
                              i % 2 === 0 ? "bg-gray-100" : "bg-primary-100"
                            }`}>
                              <Skeleton className="h-4 w-full mb-2" />
                              <Skeleton className="h-4 w-3/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : messages?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          Nenhuma mensagem encontrada
                        </h3>
                        <p className="text-sm text-gray-500">
                          Comece a conversa enviando uma mensagem.
                        </p>
                      </div>
                    ) : (
                      messages?.map((message, index) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          isLastMessage={index === messages.length - 1}
                        />
                      ))
                    )}
                  </div>
                  
                  {/* Área de input de mensagem */}
                  <div className="p-4 border-t">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        className="min-h-10 resize-none"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={isSending || !messageContent.trim()}
                      >
                        {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Painel de Detalhes do Contato */}
                {showContactDetails && (
                  <div className="hidden md:block md:w-1/3">
                    <ContactDetailsPanel
                      contact={selectedContact}
                      onClose={() => setShowContactDetails(false)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mb-6" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Selecione uma conversa</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Escolha uma conversa da lista ao lado ou inicie uma nova conversa para começar a interagir com seus contatos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      
      {/* Modal de Nova Conversa */}
      <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Inicie uma nova conversa selecionando um contato existente ou adicionando um novo.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            setIsSending(true);
            
            try {
              const formData = new FormData(e.currentTarget);
              
              // Usar os estados React em vez dos valores do formulário
              if (isNewContact) {
                // Criando novo contato
                const contactData = {
                  name: formData.get("name") as string,
                  email: formData.get("email") as string,
                  phone: formData.get("phone") as string,
                  source: channels?.find(c => c.id.toString() === selectedChannelId)?.type || "",
                  identifier: formData.get("identifier") as string,
                };
                
                // Verificar dados obrigatórios
                if (!contactData.name || !contactData.identifier || !selectedChannelId) {
                  toast({
                    title: "Dados incompletos",
                    description: "Preencha todos os campos obrigatórios.",
                    variant: "destructive",
                  });
                  setIsSending(false);
                  return;
                }
                
                // Enviar para a API
                apiRequest("POST", "/api/contacts", contactData)
                  .then(async (res) => {
                    if (!res.ok) throw new Error("Falha ao criar contato");
                    
                    const contact = await res.json();
                    return apiRequest("POST", "/api/conversations", {
                      contactId: contact.id,
                      channelId: parseInt(selectedChannelId),
                      status: "open",
                      contactIdentifier: contact.identifier
                    });
                  })
                  .then(async (res) => {
                    if (!res.ok) throw new Error("Falha ao criar conversa");
                    
                    const conversation = await res.json();
                    setSelectedConversationId(conversation.id);
                    refetchConversations();
                    
                    toast({
                      title: "Conversa criada",
                      description: "A conversa foi iniciada com sucesso.",
                    });
                    
                    setIsNewConversationOpen(false);
                  })
                  .catch((error) => {
                    console.error("Erro:", error);
                    
                    toast({
                      title: "Erro",
                      description: "Não foi possível criar a conversa. Tente novamente.",
                      variant: "destructive",
                    });
                  })
                  .finally(() => {
                    setIsSending(false);
                  });
              } else {
                // Usando contato existente
                if (!selectedContactId || !selectedChannelId) {
                  toast({
                    title: "Dados incompletos",
                    description: "Selecione um contato e um canal de comunicação.",
                    variant: "destructive",
                  });
                  setIsSending(false);
                  return;
                }
                
                const contactId = parseInt(selectedContactId);
                
                // Buscar informações do contato
                apiRequest("GET", `/api/contacts/${contactId}`)
                  .then(async (res) => {
                    if (!res.ok) throw new Error("Falha ao buscar contato");
                    
                    const contact = await res.json();
                    return apiRequest("POST", "/api/conversations", {
                      contactId: contact.id,
                      channelId: parseInt(selectedChannelId),
                      status: "open",
                      contactIdentifier: contact.identifier
                    });
                })
                .then(async (res) => {
                  if (!res.ok) throw new Error("Falha ao criar conversa");
                  
                  const conversation = await res.json();
                  setSelectedConversationId(conversation.id);
                  refetchConversations();
                  
                  toast({
                    title: "Conversa criada",
                    description: "A conversa foi iniciada com sucesso.",
                  });
                  
                  setIsNewConversationOpen(false);
                })
                .catch((error) => {
                  console.error("Erro:", error);
                  
                  toast({
                    title: "Erro",
                    description: "Não foi possível criar a conversa. Tente novamente.",
                    variant: "destructive",
                  });
                })
                .finally(() => {
                  setIsSending(false);
                });
              }
            } catch (error) {
              console.error("Erro inesperado:", error);
              toast({
                title: "Erro",
                description: "Ocorreu um erro inesperado. Tente novamente.",
                variant: "destructive",
              });
              setIsSending(false);
            }
          }} className="space-y-4">
            {/* Opção para escolher contato existente ou criar novo */}
            <div className="grid gap-2">
              <Label>Tipo de Contato</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="existingContact"
                    name="createNewContact"
                    value="false"
                    checked={!isNewContact}
                    onChange={() => setIsNewContact(false)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="existingContact" className="cursor-pointer">Contato Existente</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="newContact"
                    name="createNewContact"
                    value="true"
                    checked={isNewContact}
                    onChange={() => setIsNewContact(true)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="newContact" className="cursor-pointer">Novo Contato</Label>
                </div>
              </div>
            </div>
            
            {/* Formulário com campos condicionais */}
            <div className="grid gap-4">
              {/* Campo para selecionar contato existente (visível apenas se "Contato Existente" estiver selecionado) */}
              {!isNewContact && (
                <div>
                  <Label htmlFor="contactId">Escolha um contato</Label>
                  <Select 
                    name="contactId" 
                    value={selectedContactId}
                    onValueChange={setSelectedContactId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactsLoading ? (
                        <SelectItem value="loading" disabled>Carregando contatos...</SelectItem>
                      ) : contacts && contacts.length > 0 ? (
                        contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.name || contact.identifier}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>Nenhum contato encontrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Campos para criar novo contato (visíveis apenas se "Novo Contato" estiver selecionado) */}
              {isNewContact && (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" name="name" placeholder="Nome do contato" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="Email do contato" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" placeholder="Telefone do contato" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="identifier">Identificador</Label>
                    <Input id="identifier" name="identifier" placeholder="ID único no canal (ex: número whatsapp)" />
                  </div>
                </div>
              )}
              
              {/* Campo para selecionar canal (visível para ambos os casos) */}
              <div className="grid gap-2">
                <Label htmlFor="channel">Canal de Comunicação</Label>
                <Select 
                  name="channelId" 
                  value={selectedChannelId}
                  onValueChange={setSelectedChannelId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelsLoading ? (
                      <SelectItem value="loading" disabled>Carregando canais...</SelectItem>
                    ) : channels && channels.length > 0 ? (
                      channels.map(channel => (
                        <SelectItem key={channel.id} value={channel.id.toString()}>
                          {translateChannel(channel.type)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>Nenhum canal configurado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewConversationOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={(!isNewContact && !selectedContactId) || !selectedChannelId || isSending}>
                {isSending ? "Criando..." : "Iniciar Conversa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

