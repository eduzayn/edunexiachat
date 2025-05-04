import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contact, Deal, Activity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Filter,
  Plus,
  Tag,
  Users,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Função para formatar data em português
const formatDate = (date: Date | string | null) => {
  if (!date) return "Não definida";
  
  const options: Intl.DateTimeFormatOptions = { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric"
  };
  return new Date(date).toLocaleDateString("pt-BR", options);
};

// Componente para exibir as informações de um contato/lead
function LeadCard({ contact }: { contact: Contact }) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [stageDialog, setStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState(contact.leadStage || "novo");
  const [selectedScore, setSelectedScore] = useState<number>(contact.leadScore || 0);
  const [location, navigate] = useLocation();
  
  // Estados para os novos diálogos
  const [tagDialog, setTagDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [tagName, setTagName] = useState("");
  const [taskDetails, setTaskDetails] = useState({
    subject: "",
    description: "",
    dueDate: "",
    type: "task"
  });

  // Função para atualizar o estágio do lead
  const updateLeadStage = async () => {
    setIsUpdating(true);
    try {
      const res = await apiRequest("PATCH", `/api/contacts/${contact.id}/lead`, {
        leadStage: selectedStage,
        leadScore: selectedScore
      });
      
      if (res.ok) {
        toast({
          title: "Lead atualizado",
          description: "Estágio e pontuação do lead atualizados com sucesso.",
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      } else {
        throw new Error("Falha ao atualizar lead");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o estágio do lead.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setStageDialog(false);
    }
  };

  // Função para adicionar tag ao contato
  const addTag = async () => {
    if (!tagName.trim()) {
      toast({
        title: "Erro",
        description: "O nome da tag não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Obter tags atuais
      const currentTags = contact.tags || [];
      
      // Verificar se a tag já existe
      if (currentTags.includes(tagName)) {
        toast({
          title: "Atenção",
          description: "Esta tag já existe para este contato.",
          variant: "default",
        });
        setIsUpdating(false);
        setTagDialog(false);
        return;
      }
      
      // Adicionar nova tag
      const updatedTags = [...currentTags, tagName];
      
      const res = await apiRequest("PATCH", `/api/contacts/${contact.id}`, {
        tags: updatedTags
      });
      
      if (res.ok) {
        toast({
          title: "Tag adicionada",
          description: `A tag "${tagName}" foi adicionada com sucesso.`,
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      } else {
        throw new Error("Falha ao adicionar tag");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a tag.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setTagDialog(false);
      setTagName("");
    }
  };

  // Função para criar nova tarefa para o contato
  const createTask = async () => {
    if (!taskDetails.subject.trim()) {
      toast({
        title: "Erro",
        description: "O assunto da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await apiRequest("POST", "/api/activities", {
        contactId: contact.id,
        subject: taskDetails.subject,
        description: taskDetails.description,
        type: taskDetails.type,
        dueDate: taskDetails.dueDate || null,
        status: "pending"
      });
      
      if (res.ok) {
        toast({
          title: "Tarefa criada",
          description: "Nova tarefa criada com sucesso para este contato.",
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      } else {
        throw new Error("Falha ao criar tarefa");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setTaskDialog(false);
      setTaskDetails({
        subject: "",
        description: "",
        dueDate: "",
        type: "task"
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{contact.name}</CardTitle>
            <CardDescription>{contact.email || "Sem email"}</CardDescription>
          </div>
          <Badge 
            variant={
              contact.leadStage === "desqualificado" ? "destructive" : 
              "default"
            }
            className={contact.leadStage === "qualificado" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
          >
            {contact.leadStage === "qualificado" ? "Qualificado" : 
             contact.leadStage === "desqualificado" ? "Desqualificado" : 
             "Novo Lead"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Origem:</span>
            <span className="font-medium">{contact.source || "Desconhecida"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pontuação (0-10):</span>
            <span className="font-medium">{contact.leadScore || 0}/10</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Último contato:</span>
            <span className="font-medium">
              {contact.lastContactDate ? formatDate(contact.lastContactDate) : "Nunca contatado"}
            </span>
          </div>
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Dialog open={stageDialog} onOpenChange={setStageDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Qualificar Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Qualificar Lead</DialogTitle>
              <DialogDescription>
                Atualize o estágio e pontuação do lead.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="stage">Estágio do Lead</Label>
                <Select 
                  value={selectedStage} 
                  onValueChange={setSelectedStage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo Lead</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="desqualificado">Desqualificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="score">Pontuação (0-10)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="10"
                  value={selectedScore}
                  onChange={(e) => setSelectedScore(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStageDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={updateLeadStage} disabled={isUpdating}>
                {isUpdating ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Diálogo para adicionar tag */}
        <Dialog open={tagDialog} onOpenChange={setTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Tag</DialogTitle>
              <DialogDescription>
                Adicione uma tag a este contato para melhor organização.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tagName">Nome da Tag</Label>
                <Input
                  id="tagName"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Digite o nome da tag"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTagDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={addTag} disabled={isUpdating}>
                {isUpdating ? "Adicionando..." : "Adicionar Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo para criar tarefa */}
        <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Tarefa</DialogTitle>
              <DialogDescription>
                Crie uma nova tarefa relacionada a este contato.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="taskSubject">Assunto*</Label>
                <Input
                  id="taskSubject"
                  value={taskDetails.subject}
                  onChange={(e) => setTaskDetails({...taskDetails, subject: e.target.value})}
                  placeholder="Digite o assunto da tarefa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskType">Tipo</Label>
                <Select 
                  value={taskDetails.type} 
                  onValueChange={(value) => setTaskDetails({...taskDetails, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskDueDate">Data de vencimento</Label>
                <Input
                  id="taskDueDate"
                  type="date"
                  value={taskDetails.dueDate}
                  onChange={(e) => setTaskDetails({...taskDetails, dueDate: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="taskDescription">Descrição</Label>
                <Input
                  id="taskDescription"
                  value={taskDetails.description}
                  onChange={(e) => setTaskDetails({...taskDetails, description: e.target.value})}
                  placeholder="Digite uma descrição (opcional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={createTask} disabled={isUpdating}>
                {isUpdating ? "Criando..." : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Ações <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/contact/${contact.id}`)}>
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTagDialog(true)}>
              Adicionar tag
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTaskDialog(true)}>
              Criar tarefa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={async () => {
                try {
                  console.log(`Tentando arquivar contato ${contact.id}`);
                  
                  // Usar fetch diretamente para ter mais controle e logging
                  const response = await fetch(`/api/contacts/${contact.id}/archive`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                  });
                  
                  const responseData = await response.text();
                  console.log(`Resposta do servidor:`, response.status, responseData);
                  
                  if (response.ok) {
                    toast({
                      title: "Contato arquivado",
                      description: "Contato arquivado com sucesso.",
                      variant: "default",
                    });
                    
                    // Forçar refetch dos contatos para atualizar a UI
                    setTimeout(() => {
                      refetchContacts();
                    }, 500);
                  } else {
                    throw new Error(`Falha ao arquivar contato: ${response.status} ${responseData}`);
                  }
                } catch (error) {
                  console.error("Erro ao arquivar contato:", error);
                  toast({
                    title: "Erro",
                    description: "Não foi possível arquivar o contato.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Arquivar contato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

// Interface para exibir informações adicionais do contato no deal
interface DealWithContactName extends Deal {
  contactName?: string;
}

// Componente para exibir as informações de um deal/negociação
function DealCard({ deal }: { deal: Deal }) {
  const [contactName, setContactName] = useState<string>("");
  
  // Buscar informações do contato quando o componente for montado
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await apiRequest("GET", `/api/contacts/${deal.contactId}`);
        if (res.ok) {
          const contactData = await res.json();
          setContactName(contactData.name);
        }
      } catch (error) {
        console.error("Erro ao buscar informações do contato:", error);
      }
    };
    
    fetchContactInfo();
  }, [deal.contactId]);
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{deal.title}</CardTitle>
            <CardDescription>
              {contactName || "Carregando contato..."}
            </CardDescription>
          </div>
          <Badge 
            variant={
              deal.status === "won" ? "default" : 
              deal.status === "lost" ? "destructive" : 
              "default"
            }
            className={deal.status === "won" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
          >
            {deal.status === "won" ? "Ganho" : 
             deal.status === "lost" ? "Perdido" : 
             "Em negociação"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(deal.value || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Etapa:</span>
            <span className="font-medium">{deal.stage || "Qualificação"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Data de fechamento prevista:</span>
            <span className="font-medium">
              {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "Não definida"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button variant="outline" size="sm">
          Atualizar Status
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Ações <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Adicionar atividade</DropdownMenuItem>
            <DropdownMenuItem>Editar negociação</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Cancelar negociação
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

// Interface para exibir informações adicionais para atividades
interface ActivityWithRelations extends Activity {
  contactName?: string;
  dealTitle?: string;
}

// Componente para exibir as informações de uma atividade
function ActivityCard({ activity }: { activity: Activity }) {
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  const [contactName, setContactName] = useState<string>("");
  const [dealTitle, setDealTitle] = useState<string>("");
  
  // Buscar informações do contato e negócio quando o componente for montado
  useEffect(() => {
    const fetchRelatedInfo = async () => {
      try {
        // Buscar informações do contato
        if (activity.contactId) {
          const contactRes = await apiRequest("GET", `/api/contacts/${activity.contactId}`);
          if (contactRes.ok) {
            const contactData = await contactRes.json();
            setContactName(contactData.name);
          }
        }
        
        // Buscar informações do deal
        if (activity.dealId) {
          const dealRes = await apiRequest("GET", `/api/deals/${activity.dealId}`);
          if (dealRes.ok) {
            const dealData = await dealRes.json();
            setDealTitle(dealData.title);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar informações relacionadas:", error);
      }
    };
    
    fetchRelatedInfo();
  }, [activity.contactId, activity.dealId]);
  
  // Função para marcar uma atividade como concluída
  const markAsCompleted = async () => {
    setIsCompleting(true);
    try {
      const res = await apiRequest("PATCH", `/api/activities/${activity.id}`, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
      
      if (res.ok) {
        toast({
          title: "Atividade concluída",
          description: "Atividade marcada como concluída com sucesso.",
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      } else {
        throw new Error("Falha ao atualizar atividade");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a atividade como concluída.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Verificar se a data de vencimento passou
  const isOverdue = activity.dueDate ? new Date(activity.dueDate) < new Date() : false;

  return (
    <Card className={`mb-4 ${activity.status === "completed" ? "opacity-75" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{activity.subject}</CardTitle>
            <CardDescription>
              {contactName || dealTitle || "Atividade independente"}
            </CardDescription>
          </div>
          <Badge 
            variant={
              activity.status === "completed" ? "default" : 
              isOverdue ? "destructive" : 
              "default"
            }
            className={activity.status === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
          >
            {activity.status === "completed" ? "Concluída" : 
             isOverdue ? "Atrasada" : 
             "Pendente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tipo:</span>
            <span className="font-medium">
              {activity.type === "call" ? "Ligação" :
               activity.type === "meeting" ? "Reunião" :
               activity.type === "email" ? "Email" :
               activity.type === "task" ? "Tarefa" : "Outra"}
            </span>
          </div>
          {activity.dueDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Data de vencimento:</span>
              <span className="font-medium">
                {formatDate(activity.dueDate)}
              </span>
            </div>
          )}
          {activity.description && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{activity.description}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        {activity.status !== "completed" ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAsCompleted}
            disabled={isCompleting}
          >
            {isCompleting ? "Marcando..." : "Marcar como concluída"}
            <Check className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            Concluída em {activity.completedAt ? formatDate(activity.completedAt) : "N/A"}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Ações <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Editar atividade</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Excluir atividade
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState("leads");
  const [filter, setFilter] = useState<string>("all");
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Fetch contacts (leads) - com staleTime reduzido para sempre buscar dados mais recentes
  const { 
    data: contacts, 
    isLoading: contactsLoading,
    refetch: refetchContacts
  } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/contacts", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          console.error("Erro HTTP ao buscar contatos:", response.status);
          return [];
        }
        
        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (jsonError) {
          console.error("Erro ao processar JSON dos contatos:", jsonError);
          return [];
        }
      } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        return [];
      }
    },
    staleTime: 0, // Considera os dados sempre desatualizados
    refetchOnMount: true, // Refaz a consulta quando o componente é montado
  });
  
  // Buscar leads imediatamente quando o componente é montado
  useEffect(() => {
    refetchContacts();
  }, [refetchContacts]);
  
  // Fetch deals
  const { 
    data: deals, 
    isLoading: dealsLoading,
    refetch: refetchDeals
  } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/deals", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          console.error("Erro HTTP ao buscar negociações:", response.status);
          return [];
        }
        
        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (jsonError) {
          console.error("Erro ao processar JSON das negociações:", jsonError);
          return [];
        }
      } catch (error) {
        console.error("Erro ao buscar negociações:", error);
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: true,
  });
  
  // Force-refetch deals when needed
  useEffect(() => {
    refetchDeals();
  }, [refetchDeals]);
  
  // Fetch activities
  const { 
    data: activities, 
    isLoading: activitiesLoading,
    refetch: refetchActivities
  } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/activities", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          console.error("Erro HTTP ao buscar atividades:", response.status);
          return [];
        }
        
        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (jsonError) {
          console.error("Erro ao processar JSON das atividades:", jsonError);
          return [];
        }
      } catch (error) {
        console.error("Erro ao buscar atividades:", error);
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: true,
  });
  
  // Force-refetch activities when needed
  useEffect(() => {
    refetchActivities();
  }, [refetchActivities]);
  
  // Este efeito configura a escuta de eventos em tempo real
  useEffect(() => {
    // Log quando a página é montada
    console.log("CRM page montada! Configurando listeners para eventos em tempo real");
    
    // Configurar listener para eventos de contato atualizado
    const handleContactUpdated = (data: any) => {
      console.log("Evento de contato atualizado recebido:", data);
      // Se o contato foi arquivado, atualizar a UI
      if (data && data.status === "arquivado") {
        console.log("Contato arquivado, atualizando lista de contatos");
        refetchContacts();
      }
    };
    
    // Configurar listener para outros eventos relevantes
    const handleDealCreated = () => refetchDeals();
    const handleDealUpdated = () => refetchDeals();
    const handleActivityCreated = () => refetchActivities();
    const handleActivityUpdated = () => refetchActivities();
    
    // Adicionar os listeners
    window.addEventListener("contact_updated", (e: any) => handleContactUpdated(e.detail));
    window.addEventListener("deal_created", () => handleDealCreated());
    window.addEventListener("deal_updated", () => handleDealUpdated());
    window.addEventListener("activity_created", () => handleActivityCreated());
    window.addEventListener("activity_updated", () => handleActivityUpdated());
    
    // Limpeza ao desmontar
    return () => {
      window.removeEventListener("contact_updated", (e: any) => handleContactUpdated(e.detail));
      window.removeEventListener("deal_created", () => handleDealCreated());
      window.removeEventListener("deal_updated", () => handleDealUpdated());
      window.removeEventListener("activity_created", () => handleActivityCreated());
      window.removeEventListener("activity_updated", () => handleActivityUpdated());
    };
  }, [refetchContacts, refetchDeals, refetchActivities]);
  
  // Filtrar leads com base no filtro selecionado e remover os arquivados
  const filteredContacts = contacts?.filter(contact => {
    // Não mostrar contatos arquivados na lista
    if (contact.status === "arquivado") return false;
    
    // Aplicar filtros normais
    if (filter === "all") return true;
    if (filter === "new") return contact.leadStage === "novo" || !contact.leadStage;
    if (filter === "qualified") return contact.leadStage === "qualificado";
    if (filter === "disqualified") return contact.leadStage === "desqualificado";
    return true;
  });
  
  // Filtrar deals com base no filtro selecionado
  const filteredDeals = deals?.filter(deal => {
    if (filter === "all") return true;
    if (filter === "open") return deal.status === "open";
    if (filter === "won") return deal.status === "won";
    if (filter === "lost") return deal.status === "lost";
    return true;
  });
  
  // Filtrar atividades com base no filtro selecionado
  const filteredActivities = activities?.filter(activity => {
    if (filter === "all") return true;
    if (filter === "pending") return activity.status === "pending";
    if (filter === "completed") return activity.status === "completed";
    if (filter === "overdue") return activity.status === "pending" && activity.dueDate && new Date(activity.dueDate) < new Date();
    return true;
  });
  
  // Ações específicas do cabeçalho para cada tab
  const getHeaderActions = () => {
    if (activeTab === "leads") {
      return (
        <Button onClick={() => setIsLeadFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      );
    } else if (activeTab === "deals") {
      return (
        <Button onClick={() => setIsDealFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Negociação
        </Button>
      );
    } else if (activeTab === "activities") {
      return (
        <Button onClick={() => setIsActivityFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      );
    }
    return null;
  };

  return (
    <AppShell title="CRM">
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <PageHeader
          title="CRM"
          description="Gerencie leads, negociações e atividades"
          breadcrumbs={[{ label: "CRM" }]}
          actions={getHeaderActions()}
          className="py-4 px-6"
        />
        
        <div className="flex-1 overflow-auto px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="leads" className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Leads
                </TabsTrigger>
                <TabsTrigger value="deals" className="flex items-center">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Negociações
                </TabsTrigger>
                <TabsTrigger value="activities" className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Atividades
                </TabsTrigger>
              </TabsList>
              
              <div className="flex space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      Filtrar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                    {activeTab === "leads" && (
                      <>
                        <DropdownMenuItem onClick={() => setFilter("all")}>
                          Todos os leads
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("new")}>
                          Novos leads
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("qualified")}>
                          Leads qualificados
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("disqualified")}>
                          Leads desqualificados
                        </DropdownMenuItem>
                      </>
                    )}
                    {activeTab === "deals" && (
                      <>
                        <DropdownMenuItem onClick={() => setFilter("all")}>
                          Todas as negociações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("open")}>
                          Negociações em aberto
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("won")}>
                          Negociações ganhas
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("lost")}>
                          Negociações perdidas
                        </DropdownMenuItem>
                      </>
                    )}
                    {activeTab === "activities" && (
                      <>
                        <DropdownMenuItem onClick={() => setFilter("all")}>
                          Todas as atividades
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("pending")}>
                          Atividades pendentes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("completed")}>
                          Atividades concluídas
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter("overdue")}>
                          Atividades atrasadas
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  size="sm" 
                  className="flex items-center"
                  onClick={() => {
                    if (activeTab === "leads") {
                      setIsLeadFormOpen(true);
                    } else if (activeTab === "deals") {
                      setIsDealFormOpen(true);
                    } else if (activeTab === "activities") {
                      setIsActivityFormOpen(true);
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {activeTab === "leads" ? "Novo Lead" : 
                   activeTab === "deals" ? "Nova Negociação" : 
                   "Nova Atividade"}
                </Button>
              </div>
            </div>
            
            <TabsContent value="leads" className="space-y-4">
              {contactsLoading ? (
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
              ) : filteredContacts?.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum lead encontrado</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {filter !== "all" 
                      ? "Tente alterar o filtro para ver mais resultados." 
                      : "Comece adicionando um novo lead ao sistema."}
                  </p>
                  {/* Botão removido para evitar duplicação */}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContacts?.map((contact) => (
                    <LeadCard key={contact.id} contact={contact} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="deals" className="space-y-4">
              {dealsLoading ? (
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
              ) : filteredDeals?.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma negociação encontrada</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {filter !== "all" 
                      ? "Tente alterar o filtro para ver mais resultados." 
                      : "Comece adicionando uma nova negociação ao sistema."}
                  </p>
                  {/* Botão removido para evitar duplicação */}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDeals?.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activities" className="space-y-4">
              {activitiesLoading ? (
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
              ) : filteredActivities?.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma atividade encontrada</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {filter !== "all" 
                      ? "Tente alterar o filtro para ver mais resultados." 
                      : "Comece adicionando uma nova atividade ao sistema."}
                  </p>
                  {/* Botão removido para evitar duplicação */}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActivities?.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Formulário para adicionar lead */}
      <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
            <DialogDescription>
              Adicione um novo lead ao sistema.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            const leadData = {
              name: formData.get("name") as string,
              email: formData.get("email") as string,
              phone: formData.get("phone") as string,
              source: formData.get("source") as string,
              identifier: formData.get("identifier") as string || formData.get("email") as string,
              leadStage: "novo",
              leadScore: 0
            };
            
            console.log("Submitting form data:", leadData);
            
            try {
              // Enviar dados para a API usando fetch diretamente para maior controle
              const response = await fetch("/api/contacts", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(leadData),
                credentials: "include"
              });
              
              if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
              }
              
              const data = await response.json();
              console.log("API response:", data);
              
              toast({
                title: "Lead adicionado",
                description: "O lead foi adicionado com sucesso.",
                variant: "default",
              });
              
              // Invalidar consultas e forçar recarga dos dados
              queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
              
              // Adicionar um pequeno delay para garantir que o servidor processou o pedido
              setTimeout(() => {
                refetchContacts();
              }, 500);
              
              setIsLeadFormOpen(false);
            } catch (error) {
              console.error("Erro ao adicionar lead:", error);
              toast({
                title: "Erro",
                description: "Não foi possível adicionar o lead. Tente novamente.",
                variant: "destructive",
              });
            }
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome*</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nome do lead"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="(99) 99999-9999"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="source">Origem*</Label>
              <Select name="source" defaultValue="manual">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Adição Manual</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="identifier">Identificador</Label>
              <Input
                id="identifier"
                name="identifier"
                placeholder="Identificador único (opcional)"
              />
              <p className="text-xs text-muted-foreground">
                Se não for informado, o email será usado como identificador.
              </p>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLeadFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Formulário para adicionar negociação */}
      <Dialog open={isDealFormOpen} onOpenChange={setIsDealFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Negociação</DialogTitle>
            <DialogDescription>
              Adicione uma nova negociação ao sistema.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            const dealData = {
              title: formData.get("title") as string,
              contactId: parseInt(formData.get("contactId") as string),
              value: parseFloat(formData.get("value") as string) || 0,
              stage: formData.get("stage") as string,
              status: "open",
              expectedCloseDate: formData.get("expectedCloseDate") as string
            };
            
            console.log("Submitting deal data:", dealData);
            
            try {
              // Enviar dados para a API usando fetch diretamente para maior controle
              const response = await fetch("/api/deals", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(dealData),
                credentials: "include"
              });
              
              if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
              }
              
              const data = await response.json();
              console.log("API response:", data);
              
              toast({
                title: "Negociação adicionada",
                description: "A negociação foi adicionada com sucesso.",
                variant: "default",
              });
              
              // Invalidar consultas e forçar recarga dos dados
              queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
              
              // Adicionar um pequeno delay para garantir que o servidor processou o pedido
              setTimeout(() => {
                refetchDeals();
              }, 500);
              
              setIsDealFormOpen(false);
            } catch (error) {
              console.error("Erro ao adicionar negociação:", error);
              toast({
                title: "Erro",
                description: "Não foi possível adicionar a negociação. Tente novamente.",
                variant: "destructive",
              });
            }
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título*</Label>
              <Input
                id="title"
                name="title"
                placeholder="Título da negociação"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contactId">Contato*</Label>
              <Select name="contactId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="stage">Etapa*</Label>
              <Select name="stage" defaultValue="qualificacao">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualificacao">Qualificação</SelectItem>
                  <SelectItem value="apresentacao">Apresentação</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechamento">Fechamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="expectedCloseDate">Data de fechamento prevista</Label>
              <Input
                id="expectedCloseDate"
                name="expectedCloseDate"
                type="date"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDealFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Negociação</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Formulário para adicionar atividade */}
      <Dialog open={isActivityFormOpen} onOpenChange={setIsActivityFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>
              Adicione uma nova atividade ao sistema.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            
            const activityData = {
              subject: formData.get("title") as string,
              description: formData.get("description") as string,
              type: formData.get("type") as string,
              contactId: parseInt(formData.get("contactId") as string),
              dealId: formData.get("dealId") && formData.get("dealId") !== "" 
                ? parseInt(formData.get("dealId") as string) 
                : null,
              dueDate: formData.get("dueDate") as string,
              status: "pending"
            };
            
            console.log("Submitting activity data:", activityData);
            
            try {
              // Enviar dados para a API usando fetch diretamente para maior controle
              const response = await fetch("/api/activities", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(activityData),
                credentials: "include"
              });
              
              if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
              }
              
              const data = await response.json();
              console.log("API response:", data);
              
              toast({
                title: "Atividade adicionada",
                description: "A atividade foi adicionada com sucesso.",
                variant: "default",
              });
              
              // Invalidar consultas e forçar recarga dos dados
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
              
              // Adicionar um pequeno delay para garantir que o servidor processou o pedido
              setTimeout(() => {
                refetchActivities();
              }, 500);
              
              setIsActivityFormOpen(false);
            } catch (error) {
              console.error("Erro ao adicionar atividade:", error);
              toast({
                title: "Erro",
                description: "Não foi possível adicionar a atividade. Tente novamente.",
                variant: "destructive",
              });
            }
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título*</Label>
              <Input
                id="title"
                name="title"
                placeholder="Título da atividade"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                placeholder="Descrição da atividade"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo*</Label>
              <Select name="type" defaultValue="tarefa">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarefa">Tarefa</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="lembrete">Lembrete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contactId">Contato*</Label>
              <Select name="contactId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dealId">Negociação (opcional)</Label>
              <Select name="dealId">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma negociação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {deals?.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id.toString()}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Data de vencimento*</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                required
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsActivityFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Atividade</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}