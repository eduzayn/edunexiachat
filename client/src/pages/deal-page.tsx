import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Building2,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart2,
} from "lucide-react";

// Interfaces para os dados
interface Deal {
  id: number;
  contactId: number;
  title: string;
  value?: number;
  currency: string;
  stage: string;
  status: string;
  probability?: number;
  expectedCloseDate?: string | Date;
  description?: string;
  assignedTo?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

interface User {
  id: number;
  name: string;
}

interface Activity {
  id: number;
  contactId: number;
  userId?: number;
  dealId?: number;
  type: string;
  subject: string;
  description?: string;
  dueDate?: string | Date;
  completed?: boolean;
  status: string;
  completedAt?: string | Date;
  result?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Função para formatar datas
function formatDate(dateStr: string | Date | undefined) {
  if (!dateStr) return "Não definida";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Tradução dos estágios da negociação
function translateStage(stage: string) {
  const stages: {[key: string]: string} = {
    "qualificacao": "Qualificação",
    "apresentacao": "Apresentação",
    "proposta": "Proposta",
    "negociacao": "Negociação",
    "fechamento": "Fechamento"
  };
  
  return stages[stage] || stage;
}

// Formatação de valores monetários
function formatCurrency(value: number | undefined, currency: string = "BRL") {
  if (value === undefined) return "R$ 0,00";
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(value);
}

// Componente principal da página
export default function DealPage() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dealId = params.id;
  
  // Estados
  const [deal, setDeal] = useState<Deal | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  // Estados de formulário para edição
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState<number | undefined>(undefined);
  const [editStage, setEditStage] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpectedCloseDate, setEditExpectedCloseDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState<number | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Buscar dados da negociação
  useEffect(() => {
    const fetchDealDetails = async () => {
      setLoading(true);
      try {
        if (!dealId) {
          throw new Error("ID da negociação não fornecido");
        }
        
        // Buscar detalhes da negociação
        const dealRes = await apiRequest("GET", `/api/deals/${dealId}`);
        if (dealRes.ok) {
          const dealData = await dealRes.json();
          setDeal(dealData);
          
          // Configurar estados de edição
          setEditTitle(dealData.title);
          setEditValue(dealData.value);
          setEditStage(dealData.stage);
          setEditDescription(dealData.description || "");
          setEditExpectedCloseDate(dealData.expectedCloseDate ? 
            new Date(dealData.expectedCloseDate).toISOString().split('T')[0] : "");
          setEditAssignedTo(dealData.assignedTo);
          
          // Buscar detalhes do contato
          if (dealData.contactId) {
            const contactRes = await apiRequest("GET", `/api/contacts/${dealData.contactId}`);
            if (contactRes.ok) {
              setContact(await contactRes.json());
            }
          }
          
          // Buscar usuário responsável
          if (dealData.assignedTo) {
            const userRes = await apiRequest("GET", `/api/users/${dealData.assignedTo}`);
            if (userRes.ok) {
              setAssignedUser(await userRes.json());
            }
          }
          
          // Buscar lista de usuários para o select
          const usersRes = await apiRequest("GET", "/api/users");
          if (usersRes.ok) {
            setUsers(await usersRes.json());
          }
          
          // Buscar atividades relacionadas à negociação
          const activitiesRes = await apiRequest("GET", `/api/activities?dealId=${dealId}`);
          if (activitiesRes.ok) {
            setActivities(await activitiesRes.json());
          }
        } else {
          throw new Error("Negociação não encontrada");
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes da negociação:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes da negociação.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDealDetails();
  }, [dealId, toast]);
  
  // Atualizar estágio da negociação
  const updateDealStage = async (newStage: string) => {
    try {
      setIsUpdating(true);
      const res = await apiRequest("PATCH", `/api/deals/${dealId}`, {
        stage: newStage
      });
      
      if (res.ok) {
        toast({
          title: "Estágio atualizado",
          description: `Estágio alterado para ${translateStage(newStage)}.`,
          variant: "default",
        });
        
        // Atualizar a negociação localmente
        if (deal) {
          setDeal({
            ...deal,
            stage: newStage
          });
        }
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        setIsStageDialogOpen(false);
      } else {
        throw new Error("Falha ao atualizar estágio");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o estágio da negociação.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Atualizar status da negociação (ganho ou perdido)
  const updateDealStatus = async (newStatus: "won" | "lost") => {
    try {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}`, {
        status: newStatus
      });
      
      if (res.ok) {
        toast({
          title: newStatus === "won" ? "Negociação ganha!" : "Negociação perdida",
          description: newStatus === "won" ? 
            "Esta negociação foi marcada como ganha." : 
            "Esta negociação foi marcada como perdida.",
          variant: newStatus === "won" ? "default" : "destructive",
        });
        
        // Atualizar a negociação localmente
        if (deal) {
          setDeal({
            ...deal,
            status: newStatus
          });
        }
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      } else {
        throw new Error("Falha ao atualizar status");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da negociação.",
        variant: "destructive",
      });
    }
  };
  
  // Salvar alterações da negociação
  const saveDealChanges = async () => {
    try {
      setIsUpdating(true);
      const res = await apiRequest("PATCH", `/api/deals/${dealId}`, {
        title: editTitle,
        value: editValue,
        description: editDescription,
        expectedCloseDate: editExpectedCloseDate || null,
        assignedTo: editAssignedTo || null
      });
      
      if (res.ok) {
        toast({
          title: "Negociação atualizada",
          description: "As alterações foram salvas com sucesso.",
          variant: "default",
        });
        
        // Atualizar a negociação localmente
        if (deal) {
          const updatedDeal = {
            ...deal,
            title: editTitle,
            value: editValue,
            description: editDescription,
            expectedCloseDate: editExpectedCloseDate || null,
            assignedTo: editAssignedTo || null
          };
          setDeal(updatedDeal);
        }
        
        // Atualizar o usuário responsável se necessário
        if (editAssignedTo && editAssignedTo !== deal?.assignedTo) {
          const userRes = await apiRequest("GET", `/api/users/${editAssignedTo}`);
          if (userRes.ok) {
            setAssignedUser(await userRes.json());
          }
        } else if (!editAssignedTo) {
          setAssignedUser(null);
        }
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        setIsEditDialogOpen(false);
      } else {
        throw new Error("Falha ao atualizar negociação");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a negociação.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Excluir negociação
  const deleteDeal = async () => {
    try {
      setIsDeleting(true);
      const res = await apiRequest("DELETE", `/api/deals/${dealId}`);
      
      if (res.ok) {
        toast({
          title: "Negociação excluída",
          description: "A negociação foi removida com sucesso.",
          variant: "default",
        });
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        
        // Redirecionar para a página de contato se tiver contactId ou para o CRM
        if (deal?.contactId) {
          navigate(`/contact/${deal.contactId.toString()}`);
        } else {
          navigate("/crm");
        }
      } else {
        throw new Error("Falha ao excluir negociação");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a negociação.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Renderizar esqueleto de carregamento
  if (loading) {
    return (
      <AppShell>
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center space-x-2 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-12 w-[300px]" />
            <Skeleton className="h-4 w-[250px]" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }
  
  // Caso a negociação não seja encontrada
  if (!deal) {
    return (
      <AppShell>
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Negociação não encontrada</CardTitle>
              <CardDescription>
                A negociação que você está procurando não existe ou foi removida.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate("/crm")}>
                Voltar para CRM
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }
  
  return (
    <AppShell>
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center space-x-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        {/* Cabeçalho com título e botões de ação */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{deal.title}</h1>
            <div className="flex items-center mt-1">
              {contact && (
                <a 
                  href={`/contact/${contact.id.toString()}`}
                  className="text-muted-foreground hover:underline flex items-center"
                >
                  <User className="h-4 w-4 mr-1" />
                  {contact.name}
                </a>
              )}
              
              {contact && contact.company && (
                <>
                  <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
                  <span className="text-muted-foreground flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    {contact.company}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            {deal.status === "open" ? (
              <>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                  Editar
                </Button>
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => updateDealStatus("won")}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Ganho
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => updateDealStatus("lost")}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Perdido
                </Button>
              </>
            ) : (
              <Badge 
                variant={deal.status === "won" ? "default" : "destructive"}
                className={deal.status === "won" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
              >
                {deal.status === "won" ? "Ganho" : "Perdido"}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Detalhes da negociação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Detalhes da Negociação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium">{formatCurrency(deal.value, deal.currency)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estágio:</span>
                <div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7"
                    onClick={() => setIsStageDialogOpen(true)}
                  >
                    {translateStage(deal.stage)}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Probabilidade:</span>
                <span className="font-medium">{deal.probability || 0}%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Responsável:</span>
                <span className="font-medium">{assignedUser ? assignedUser.name : "Não atribuído"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data prevista de fechamento:</span>
                <span className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(deal.expectedCloseDate)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(deal.createdAt)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Atualizado em:</span>
                <span className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(deal.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {deal.description || "Nenhuma descrição disponível."}
              </p>
            </CardContent>
            <CardFooter className="justify-between">
              {deal.status === "open" && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Editar Detalhes</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Editar Negociação</DialogTitle>
                      <DialogDescription>
                        Atualize os detalhes desta negociação. Clique em salvar quando terminar.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="value">Valor (R$)</Label>
                        <Input
                          id="value"
                          type="number"
                          value={editValue || ""}
                          onChange={(e) => setEditValue(parseFloat(e.target.value) || undefined)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expectedCloseDate">Data prevista de fechamento</Label>
                        <Input
                          id="expectedCloseDate"
                          type="date"
                          value={editExpectedCloseDate}
                          onChange={(e) => setEditExpectedCloseDate(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="assignedTo">Responsável</Label>
                        <Select 
                          value={editAssignedTo?.toString() || ""} 
                          onValueChange={(value) => setEditAssignedTo(value ? parseInt(value) : undefined)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Não atribuído</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={saveDealChanges}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Salvando..." : "Salvar alterações"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button variant="destructive" onClick={deleteDeal} disabled={isDeleting}>
                {isDeleting ? "Excluindo..." : "Excluir Negociação"}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Seção de Atividades */}
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Atividades</CardTitle>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/deal/${dealId}/create-activity`)}
                >
                  Nova Atividade
                </Button>
              </div>
              <CardDescription>
                Histórico de interações e tarefas relacionadas a esta negociação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma atividade registrada.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate(`/deal/${dealId}/create-activity`)}
                  >
                    Criar Primeira Atividade
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{activity.subject}</CardTitle>
                            <CardDescription>
                              {activity.type === "call" ? "Ligação" :
                               activity.type === "meeting" ? "Reunião" :
                               activity.type === "email" ? "Email" :
                               activity.type === "task" ? "Tarefa" : "Outra"}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={
                              activity.status === "completed" ? "default" : 
                              new Date(activity.dueDate || "") < new Date() ? "destructive" : 
                              "default"
                            }
                            className={activity.status === "completed" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                          >
                            {activity.status === "completed" ? "Concluída" : 
                             new Date(activity.dueDate || "") < new Date() ? "Atrasada" : 
                             "Pendente"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {activity.dueDate ? formatDate(activity.dueDate) : "Sem data definida"}
                          {activity.completedAt && (
                            <span className="ml-2">
                              (Concluída em {formatDate(activity.completedAt)})
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Modal para alterar estágio */}
        <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Atualizar Estágio</DialogTitle>
              <DialogDescription>
                Selecione o novo estágio da negociação.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="stage">Estágio da Negociação</Label>
              <Select value={editStage || deal.stage} onValueChange={setEditStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estágio" />
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
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsStageDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => updateDealStage(editStage || deal.stage)}
                disabled={isUpdating}
              >
                {isUpdating ? "Atualizando..." : "Atualizar Estágio"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}