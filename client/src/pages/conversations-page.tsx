import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  UserPlus,
  Clock,
  Filter
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Conversation as ConversationType } from "@shared/schema";

// Estender a interface de Conversation para incluir relações populadas
interface Conversation extends ConversationType {
  contact?: {
    id: number;
    name: string;
    identifier: string;
  };
  channel?: {
    id: number;
    name: string;
    type: string;
  };
  lastMessage?: {
    id: number;
    content: string;
    createdAt: string;
  };
  assignedTo?: {
    id: number;
    name: string;
  };
  assignedToId?: number;
}
import { useAuth } from "@/hooks/use-auth";

export default function ConversationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateConversationOpen, setIsCreateConversationOpen] = useState(false);
  
  // Buscar conversas
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations");
      if (!response.ok) {
        throw new Error("Falha ao carregar conversas");
      }
      return response.json();
    }
  });
  
  // Buscar contatos para criar novas conversas
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/contacts");
      if (!response.ok) {
        throw new Error("Falha ao carregar contatos");
      }
      return response.json();
    }
  });
  
  // Buscar canais disponíveis
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const response = await fetch("/api/channels");
      if (!response.ok) {
        throw new Error("Falha ao carregar canais");
      }
      return response.json();
    }
  });
  
  // Filtrar conversas com base na guia ativa e na pesquisa
  const filteredConversations = conversations?.filter((conversation: any) => {
    // Filtro de pesquisa
    const matchesSearch = searchQuery 
      ? (conversation.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    // Filtro de guia
    let matchesTab = true;
    if (activeTab === "unassigned") {
      matchesTab = !conversation.assignedToId;
    } else if (activeTab === "mine") {
      matchesTab = conversation.assignedToId === user?.id;
    }
    
    return matchesSearch && matchesTab;
  });
  
  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diff / 1000 / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) {
      return "agora";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'} atrás`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hora' : 'horas'} atrás`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };
  
  // Componente de card para uma conversa
  const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
    // Obter informações sobre a conversa
    const { id, contact, assignedToId, status, lastMessage, channel } = conversation;
    const lastMessageTime = lastMessage?.createdAt ? formatDate(lastMessage.createdAt) : "Sem mensagens";
    
    return (
      <Card className="hover:bg-accent/10 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base flex items-center">
                <span className="mr-2">{contact?.name || "Contato desconhecido"}</span>
                {channel && (
                  <Badge variant="outline">{channel.name}</Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center text-xs mt-1">
                <Clock className="h-3 w-3 mr-1" />
                {lastMessageTime}
              </CardDescription>
            </div>
            {status && (
              <Badge 
                variant={status === "open" ? "default" : 
                         status === "pending" ? "secondary" : 
                         "outline"}
              >
                {status === "open" ? "Aberta" : 
                 status === "pending" ? "Pendente" : 
                 "Resolvida"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-sm line-clamp-2">
            {lastMessage?.content || "Sem mensagens"}
          </p>
        </CardContent>
        <CardFooter className="pt-2 flex justify-between">
          <div className="text-xs text-muted-foreground">
            {assignedToId 
              ? `Atribuído a: ${conversation.assignedTo?.name || 'Agente'}`
              : 'Não atribuído'}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto"
            onClick={() => window.location.href = `/inbox?conversation=${id}`}
          >
            Abrir conversa
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Renderizar o componente principal
  return (
    <AppShell title="Conversas">
      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <PageHeader
          title="Conversas"
          description="Gerencie todas as suas conversas em um só lugar"
          breadcrumbs={[{ label: "Conversas" }]}
          actions={
            <Button onClick={() => setIsCreateConversationOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conversa
            </Button>
          }
          className="py-4 px-6"
        />
        
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="all" className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                Todas
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="flex items-center">
                <UserPlus className="mr-2 h-4 w-4" />
                Não atribuídas
              </TabsTrigger>
              <TabsTrigger value="mine" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Minhas
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4">
              {conversationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/4" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-8 w-28" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma conversa encontrada</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {searchQuery
                      ? "Tente alterar os termos da pesquisa para encontrar o que procura."
                      : activeTab === "unassigned"
                      ? "Não há conversas não atribuídas no momento."
                      : activeTab === "mine"
                      ? "Você não tem conversas atribuídas a você."
                      : "Comece adicionando uma nova conversa."}
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setIsCreateConversationOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Conversa
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredConversations?.map((conversation: Conversation) => (
                    <ConversationCard key={conversation.id} conversation={conversation} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Modal para criar nova conversa */}
      <Dialog open={isCreateConversationOpen} onOpenChange={setIsCreateConversationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Inicie uma nova conversa com um contato.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            const conversationData = {
              contactId: parseInt(formData.get("contactId") as string),
              channelId: parseInt(formData.get("channelId") as string),
              status: "open",
              contactIdentifier: contacts?.find(c => c.id === parseInt(formData.get("contactId") as string))?.identifier
            };
            
            // Enviar dados para a API
            apiRequest("POST", "/api/conversations", conversationData)
              .then((res) => {
                if (res.ok) {
                  toast({
                    title: "Conversa criada",
                    description: "A conversa foi criada com sucesso.",
                    variant: "default",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                  setIsCreateConversationOpen(false);
                  // Redirecionar para a caixa de entrada com a conversa aberta
                  return res.json().then(data => {
                    window.location.href = `/inbox?conversation=${data.id}`;
                  });
                } else {
                  throw new Error("Erro ao criar conversa");
                }
              })
              .catch((error) => {
                toast({
                  title: "Erro",
                  description: "Não foi possível criar a conversa. Tente novamente.",
                  variant: "destructive",
                });
              });
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="contactId">Contato*</Label>
              <Select name="contactId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contactsLoading ? (
                    <SelectItem value="loading" disabled>Carregando contatos...</SelectItem>
                  ) : contacts?.length === 0 ? (
                    <SelectItem value="empty" disabled>Nenhum contato encontrado</SelectItem>
                  ) : (
                    contacts?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="channelId">Canal*</Label>
              <Select name="channelId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {channelsLoading ? (
                    <SelectItem value="loading" disabled>Carregando canais...</SelectItem>
                  ) : channels?.length === 0 ? (
                    <SelectItem value="empty" disabled>Nenhum canal encontrado</SelectItem>
                  ) : (
                    channels?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id.toString()}>
                        {channel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateConversationOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Iniciar Conversa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}