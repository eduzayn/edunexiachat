import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
// Definindo tipos localmente para evitar problemas de importação
interface Contact {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  identifier: string;
  source: string;
  company?: string;
  position?: string;
  notes?: string;
  externalId?: string;
  status: string;
  leadStage?: string;
  leadScore?: number;
  tags?: string[];
  lastContactDate?: string | Date;
  customFields?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
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

interface Deal {
  id: number;
  contactId: number;
  title: string;
  value?: number;
  currency?: string;
  stage?: string;
  status: string;
  probability?: number;
  expectedCloseDate?: string | Date;
  description?: string;
  assignedTo?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Tag,
  Clock,
  Activity as ActivityIcon,
  DollarSign,
} from "lucide-react";

// Função para formatar datas em um formato legível em português
function formatDate(dateStr: string | Date) {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Mapear estágios de lead para nomes mais amigáveis
function translateLeadStage(stage: string | null) {
  if (!stage) return "Novo";
  
  const stages: {[key: string]: string} = {
    "novo": "Novo",
    "qualificado": "Qualificado",
    "desqualificado": "Desqualificado",
    "inicial": "Inicial"
  };
  
  return stages[stage.toLowerCase()] || stage;
}

export default function ContactDetailsPage() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const contactId = params.id;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para o diálogo de atualização de qualificação
  const [qualificationDialog, setQualificationDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Função para atualizar a qualificação do lead
  const updateLeadQualification = async () => {
    if (!contact) return;
    
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
        
        // Atualiza o contato localmente com os novos valores
        setContact({
          ...contact,
          leadStage: selectedStage || contact.leadStage,
          leadScore: selectedScore
        });
        
        // Invalida o cache para garantir dados atualizados na próxima busca
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
      setQualificationDialog(false);
    }
  };
  
  useEffect(() => {
    // Buscar detalhes do contato
    const fetchContactDetails = async () => {
      setLoading(true);
      try {
        // Buscar contato
        const contactRes = await apiRequest("GET", `/api/contacts/${contactId}`);
        if (contactRes.ok) {
          const contactData = await contactRes.json();
          setContact(contactData);
          
          // Inicializa os estados do diálogo de qualificação com os valores atuais
          setSelectedStage(contactData.leadStage || "novo");
          setSelectedScore(contactData.leadScore || 0);
          
          // Buscar atividades relacionadas ao contato
          const activitiesRes = await apiRequest("GET", `/api/activities?contactId=${contactId}`);
          if (activitiesRes.ok) {
            const activitiesData = await activitiesRes.json();
            setActivities(activitiesData);
          }
          
          // Buscar negociações relacionadas ao contato
          const dealsRes = await apiRequest("GET", `/api/deals?contactId=${contactId}`);
          if (dealsRes.ok) {
            const dealsData = await dealsRes.json();
            setDeals(dealsData);
          }
        } else {
          throw new Error("Contato não encontrado");
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do contato:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do contato.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (contactId) {
      fetchContactDetails();
    }
  }, [contactId, toast]);
  
  // Renderizar esqueletos de carregamento enquanto os dados estão sendo buscados
  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center space-x-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/crm")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-12 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <Skeleton className="h-[200px] w-full" />
            </div>
            <div>
              <Skeleton className="h-[200px] w-full" />
            </div>
          </div>
          
          <Tabs defaultValue="history" className="mt-6">
            <TabsList>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="deals">Negociações</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <div className="space-y-4">
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[100px] w-full" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  
  // Caso o contato não seja encontrado
  if (!contact) {
    return (
      <div className="container py-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/crm")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Contato não encontrado</CardTitle>
            <CardDescription>
              O contato que você está procurando não existe ou foi removido.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/crm")}>
              Voltar para CRM
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
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
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
          <p className="text-muted-foreground">
            {contact.email || "Sem email cadastrado"}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Badge className="mr-2">
            {translateLeadStage(contact.leadStage || null)}
          </Badge>
          <Badge variant="outline">
            Pontuação: {contact.leadScore}/10
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Nome:</span>
              <span className="font-medium">{contact.name}</span>
            </div>
            
            {contact.email && (
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Email:</span>
                <span className="font-medium">{contact.email}</span>
              </div>
            )}
            
            {contact.phone && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Telefone:</span>
                <span className="font-medium">{contact.phone}</span>
              </div>
            )}
            
            {contact.company && (
              <div className="flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Empresa:</span>
                <span className="font-medium">{contact.company}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground mr-2">Cadastrado em:</span>
              <span className="font-medium">{formatDate(contact.createdAt)}</span>
            </div>
            
            {contact.lastContactDate && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-2">Último contato:</span>
                <span className="font-medium">{formatDate(contact.lastContactDate)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Qualificação do Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estágio:</span>
              <Badge variant={
                contact.leadStage === "qualificado" ? "default" :
                contact.leadStage === "desqualificado" ? "destructive" :
                "secondary"
              } className={
                contact.leadStage === "qualificado" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""
              }>
                {translateLeadStage(contact.leadStage || null)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pontuação (0-10):</span>
              <span className="font-medium">{contact.leadScore}/10</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Origem:</span>
              <span className="font-medium">{contact.source || "Desconhecida"}</span>
            </div>
            
            {contact.tags && contact.tags.length > 0 && (
              <div>
                <span className="text-muted-foreground flex items-center mb-2">
                  <Tag className="h-4 w-4 mr-2" />
                  Tags:
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {contact.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {contact.notes && (
              <div>
                <span className="text-muted-foreground mb-1 block">Notas:</span>
                <p className="text-sm">{contact.notes}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Dialog open={qualificationDialog} onOpenChange={setQualificationDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  Atualizar Qualificação
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
                      value={selectedStage || "novo"} 
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
                  <Button variant="outline" onClick={() => setQualificationDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={updateLeadQualification} disabled={isUpdating}>
                    {isUpdating ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>
      
      <Tabs defaultValue="history" className="mt-6">
        <TabsList>
          <TabsTrigger value="history">
            <ActivityIcon className="h-4 w-4 mr-2" />
            Histórico de Atividades
          </TabsTrigger>
          <TabsTrigger value="deals">
            <DollarSign className="h-4 w-4 mr-2" />
            Negociações
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Atividades</CardTitle>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/contact/${contactId}/create-activity`)}
                >
                  Nova Atividade
                </Button>
              </div>
              <CardDescription>
                Histórico de interações e tarefas relacionadas a este contato
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma atividade registrada.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate(`/contact/${contactId}/create-activity`)}
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
        </TabsContent>
        
        <TabsContent value="deals">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Negociações</CardTitle>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/contact/${contactId}/create-deal`)}
                >
                  Nova Negociação
                </Button>
              </div>
              <CardDescription>
                Oportunidades de negócio relacionadas a este contato
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma negociação registrada.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate(`/contact/${contactId}/create-deal`)}
                  >
                    Criar Primeira Negociação
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {deals.map((deal) => (
                    <Card 
                      key={deal.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/deal/${deal.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{deal.title}</CardTitle>
                            <CardDescription>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(deal.value || 0)}
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
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}