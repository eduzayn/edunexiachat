import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bot, Plus, XCircle, Save, MessageCircle, Zap, Clock, RefreshCw, Play, Trash2, Edit, Brain } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Tipos
interface Automation {
  id: number;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  priority: number;
  trigger: any;
  response: any;
  modelProvider: string;
  modelConfig: any;
  schedule: any;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
}

interface AIStatus {
  openai: boolean;
  anthropic: boolean;
  perplexity: boolean;
}

interface FormValues {
  id?: number;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  priority: number;
  trigger: any;
  response: any;
  modelProvider: string;
  modelConfig: any;
  schedule: any;
}

const defaultFormValues: FormValues = {
  name: "",
  type: "quick_reply",
  description: "",
  isActive: true,
  priority: 0,
  trigger: {},
  response: { content: "" },
  modelProvider: "custom",
  modelConfig: {},
  schedule: null
}

const modelProviders = [
  { id: "custom", label: "Resposta personalizada" },
  { id: "openai", label: "OpenAI (GPT)" },
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "perplexity", label: "Perplexity (Llama)" }
];

const automationTypes = [
  { id: "quick_reply", label: "Resposta rápida" },
  { id: "chatbot", label: "Chatbot com IA" },
  { id: "trigger", label: "Automação por gatilho" },
  { id: "scheduled", label: "Automação agendada" }
];

export default function AutomationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<FormValues>(defaultFormValues);
  const [isNew, setIsNew] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Consulta de automações
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["/api/automations"],
    queryFn: async () => {
      const response = await apiRequest<Automation[]>("/api/automations");
      return response || [];
    }
  });

  // Verificar status das APIs de IA disponíveis
  const { data: aiStatus = { openai: false, anthropic: false, perplexity: false } } = useQuery({
    queryKey: ["/api/automations/ai/status"],
    queryFn: async () => {
      const response = await apiRequest<AIStatus>("/api/automations/ai/status");
      return response || { openai: false, anthropic: false, perplexity: false };
    }
  });

  // Mutação para criar/atualizar automação
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isNew) {
        return await apiRequest<Automation>("/api/automations", {
          method: "POST",
          data: values
        });
      } else {
        return await apiRequest<Automation>(`/api/automations/${values.id}`, {
          method: "PATCH",
          data: values
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setIsDialogOpen(false);
      toast({
        title: isNew ? "Automação criada" : "Automação atualizada",
        description: isNew 
          ? "A nova automação foi criada com sucesso." 
          : "As alterações foram salvas com sucesso.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Erro ao salvar automação:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a automação. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Mutação para excluir automação
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/automations/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automação excluída",
        description: "A automação foi excluída com sucesso.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir automação:", error);
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir a automação. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Mutação para executar automação manualmente
  const executeMutation = useMutation({
    mutationFn: async ({ automationId, conversationId }: { automationId: number, conversationId: number }) => {
      return await apiRequest(`/api/automations/${automationId}/execute`, {
        method: "POST",
        data: { conversationId }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Automação executada",
        description: data.executed 
          ? `Resposta: "${data.response?.substring(0, 50)}${data.response?.length > 50 ? '...' : ''}"` 
          : "A automação foi executada sem gerar resposta.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Erro ao executar automação:", error);
      toast({
        title: "Erro ao executar",
        description: "Ocorreu um erro ao executar a automação. Verifique os logs para mais detalhes.",
        variant: "destructive"
      });
    }
  });

  // Abrir o modal para criar uma nova automação
  const handleNewAutomation = () => {
    setIsNew(true);
    setEditingAutomation(defaultFormValues);
    setIsDialogOpen(true);
  };

  // Abrir o modal para editar uma automação existente
  const handleEditAutomation = (automation: Automation) => {
    setIsNew(false);
    setEditingAutomation({
      id: automation.id,
      name: automation.name,
      type: automation.type,
      description: automation.description,
      isActive: automation.isActive,
      priority: automation.priority,
      trigger: automation.trigger,
      response: automation.response,
      modelProvider: automation.modelProvider,
      modelConfig: automation.modelConfig,
      schedule: automation.schedule
    });
    setIsDialogOpen(true);
  };

  // Confirmar exclusão de automação
  const handleDeleteAutomation = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  // Executar automação manualmente
  const handleExecuteAutomation = (automation: Automation) => {
    // Obter ID da conversa para testar a automação
    const conversationId = prompt("Digite o ID da conversa para testar a automação:");
    if (conversationId && !isNaN(parseInt(conversationId))) {
      executeMutation.mutate({ 
        automationId: automation.id, 
        conversationId: parseInt(conversationId)
      });
    } else if (conversationId) {
      toast({
        title: "ID inválido",
        description: "Por favor, forneça um ID de conversa válido.",
        variant: "destructive"
      });
    }
  };

  // Filtrar automações com base no tab selecionado e no termo de busca
  // Garante que automations é um array antes de chamar filter
  const filteredAutomations = Array.isArray(automations) ? automations.filter(automation => {
    // Filtro de tipo
    if (selectedTab !== "all" && automation.type !== selectedTab) {
      return false;
    }
    
    // Filtro de busca
    if (searchTerm && 
        !automation.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !automation.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  }) : [];

  // Renderizar ícone de tipo de automação
  const getAutomationTypeIcon = (type: string) => {
    switch (type) {
      case "quick_reply":
        return <MessageCircle className="h-4 w-4" />;
      case "chatbot":
        return <Brain className="h-4 w-4" />;
      case "trigger":
        return <Zap className="h-4 w-4" />;
      case "scheduled":
        return <Clock className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  // Renderizar rótulo legível do tipo de automação
  const getAutomationTypeLabel = (type: string) => {
    const found = automationTypes.find(t => t.id === type);
    return found ? found.label : type;
  };

  // Renderizar o provedor de modelo
  const getModelProviderLabel = (provider: string) => {
    const found = modelProviders.find(p => p.id === provider);
    return found ? found.label : provider;
  };

  // Atualizar valores do formulário
  const updateFormValue = (field: keyof FormValues, value: any) => {
    setEditingAutomation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Salvar automação
  const handleSaveAutomation = () => {
    // Validação básica
    if (!editingAutomation.name.trim()) {
      toast({
        title: "Validação",
        description: "O nome da automação é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    mutation.mutate(editingAutomation);
  };

  const renderFormByType = () => {
    switch (editingAutomation.type) {
      case "quick_reply":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="response-content">Resposta</Label>
              <Textarea 
                id="response-content"
                value={editingAutomation.response?.content || ""}
                onChange={(e) => updateFormValue("response", { ...editingAutomation.response, content: e.target.value })}
                placeholder="Digite a resposta rápida que será enviada"
                className="min-h-[150px]"
              />
              <p className="text-xs text-gray-500">
                A resposta rápida será enviada automaticamente quando a automação for acionada.
              </p>
            </div>
          </div>
        );
        
      case "chatbot":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-provider">Provedor de IA</Label>
              <Select 
                value={editingAutomation.modelProvider}
                onValueChange={(value) => updateFormValue("modelProvider", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor de IA" />
                </SelectTrigger>
                <SelectContent>
                  {modelProviders.map((provider) => (
                    <SelectItem 
                      key={provider.id} 
                      value={provider.id}
                      disabled={(provider.id === "openai" && !aiStatus.openai) || 
                               (provider.id === "anthropic" && !aiStatus.anthropic) ||
                               (provider.id === "perplexity" && !aiStatus.perplexity)}
                    >
                      {provider.label} 
                      {(provider.id === "openai" && !aiStatus.openai) ||
                       (provider.id === "anthropic" && !aiStatus.anthropic) ||
                       (provider.id === "perplexity" && !aiStatus.perplexity) 
                        ? " (API não configurada)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {editingAutomation.modelProvider === "custom" ? (
              <div className="space-y-2">
                <Label htmlFor="response-content">Resposta personalizada</Label>
                <Textarea 
                  id="response-content"
                  value={editingAutomation.response?.content || ""}
                  onChange={(e) => updateFormValue("response", { ...editingAutomation.response, content: e.target.value })}
                  placeholder="Digite a resposta personalizada"
                  className="min-h-[150px]"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-instructions">Instruções para o modelo</Label>
                  <Textarea 
                    id="model-instructions"
                    value={editingAutomation.modelConfig?.instructions || ""}
                    onChange={(e) => updateFormValue("modelConfig", { ...editingAutomation.modelConfig, instructions: e.target.value })}
                    placeholder="Instruções para o modelo de IA (ex: Você é um assistente educacional especializado em matemática...)"
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-gray-500">
                    As instruções ajudam a orientar o comportamento do modelo de IA.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model-name">Nome do modelo</Label>
                  <Input 
                    id="model-name"
                    value={editingAutomation.modelConfig?.modelName || ""}
                    onChange={(e) => updateFormValue("modelConfig", { ...editingAutomation.modelConfig, modelName: e.target.value })}
                    placeholder={editingAutomation.modelProvider === "openai" ? "gpt-4o" : 
                                 editingAutomation.modelProvider === "anthropic" ? "claude-3-7-sonnet-20250219" : 
                                 "llama-3.1-sonar-small-128k-online"}
                  />
                  <p className="text-xs text-gray-500">
                    Deixe em branco para usar o modelo padrão.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model-temperature">Temperatura</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="model-temperature"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={editingAutomation.modelConfig?.temperature || 0.7}
                      onChange={(e) => updateFormValue("modelConfig", { ...editingAutomation.modelConfig, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <span className="w-10 text-center">
                      {editingAutomation.modelConfig?.temperature || 0.7}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Valores mais baixos tornam as respostas mais determinísticas, valores mais altos tornam as respostas mais criativas.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model-max-tokens">Máximo de tokens</Label>
                  <Input 
                    id="model-max-tokens"
                    type="number"
                    value={editingAutomation.modelConfig?.maxTokens || 1024}
                    onChange={(e) => updateFormValue("modelConfig", { ...editingAutomation.modelConfig, maxTokens: parseInt(e.target.value) })}
                    placeholder="1024"
                  />
                  <p className="text-xs text-gray-500">
                    Limite de tokens para a resposta. Deixe em branco para usar o valor padrão.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
        
      case "trigger":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Configuração de Gatilhos</Label>
              <p className="text-sm text-gray-500">
                Configure palavras-chave e padrões regex que acionarão respostas automáticas quando detectados nas mensagens.
              </p>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave</Label>
                  <Textarea 
                    id="keywords"
                    value={editingAutomation.trigger?.keywords?.join('\n') || ""}
                    onChange={(e) => {
                      const keywords = e.target.value.split('\n').filter(k => k.trim().length > 0);
                      updateFormValue("trigger", { 
                        ...editingAutomation.trigger, 
                        keywords 
                      });
                    }}
                    placeholder="Digite uma palavra-chave por linha"
                    className="h-24"
                  />
                  <p className="text-xs text-gray-500">
                    Digite uma palavra-chave por linha. Não diferencia maiúsculas de minúsculas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patterns">Padrões RegEx</Label>
                  <Textarea 
                    id="patterns"
                    value={editingAutomation.trigger?.patterns?.join('\n') || ""}
                    onChange={(e) => {
                      const patterns = e.target.value.split('\n').filter(p => p.trim().length > 0);
                      updateFormValue("trigger", { 
                        ...editingAutomation.trigger, 
                        patterns 
                      });
                    }}
                    placeholder="Digite um padrão regex por linha"
                    className="h-24"
                  />
                  <p className="text-xs text-gray-500">
                    Digite um padrão regex por linha. Use com cuidado para evitar erros de sintaxe.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-content">Resposta automática</Label>
                  <Textarea 
                    id="response-content"
                    value={editingAutomation.response?.content || ""}
                    onChange={(e) => updateFormValue("response", { content: e.target.value })}
                    placeholder="Digite a resposta que será enviada quando o gatilho for acionado"
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-gray-500">
                    Você pode usar as variáveis: {'{nome}'}, {'{email}'}, {'{telefone}'} para personalização.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case "scheduled":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Configuração de Agendamento</Label>
              <p className="text-sm text-gray-500">
                Configure automações para serem executadas em horários específicos ou em intervalos regulares.
              </p>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-type">Tipo de Agendamento</Label>
                  <Select 
                    value={editingAutomation.schedule?.type || "one-time"}
                    onValueChange={(value) => updateFormValue("schedule", { 
                      ...editingAutomation.schedule, 
                      type: value 
                    })}
                  >
                    <SelectTrigger id="schedule-type">
                      <SelectValue placeholder="Selecione o tipo de agendamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">Uma vez</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(editingAutomation.schedule?.type === "one-time" || !editingAutomation.schedule?.type) && (
                  <div className="space-y-2">
                    <Label htmlFor="schedule-datetime">Data e Hora</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        id="schedule-date"
                        type="date"
                        value={editingAutomation.schedule?.date || ""}
                        onChange={(e) => updateFormValue("schedule", { 
                          ...editingAutomation.schedule, 
                          date: e.target.value 
                        })}
                      />
                      <Input 
                        id="schedule-time"
                        type="time"
                        value={editingAutomation.schedule?.time || ""}
                        onChange={(e) => updateFormValue("schedule", { 
                          ...editingAutomation.schedule, 
                          time: e.target.value 
                        })}
                      />
                    </div>
                  </div>
                )}

                {editingAutomation.schedule?.type === "daily" && (
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">Horário</Label>
                    <Input 
                      id="schedule-time"
                      type="time"
                      value={editingAutomation.schedule?.time || ""}
                      onChange={(e) => updateFormValue("schedule", { 
                        ...editingAutomation.schedule, 
                        time: e.target.value 
                      })}
                    />
                  </div>
                )}

                {editingAutomation.schedule?.type === "weekly" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-day">Dia da Semana</Label>
                      <Select 
                        value={editingAutomation.schedule?.dayOfWeek?.toString() || "1"}
                        onValueChange={(value) => updateFormValue("schedule", { 
                          ...editingAutomation.schedule, 
                          dayOfWeek: parseInt(value) 
                        })}
                      >
                        <SelectTrigger id="schedule-day">
                          <SelectValue placeholder="Selecione o dia da semana" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Segunda-feira</SelectItem>
                          <SelectItem value="2">Terça-feira</SelectItem>
                          <SelectItem value="3">Quarta-feira</SelectItem>
                          <SelectItem value="4">Quinta-feira</SelectItem>
                          <SelectItem value="5">Sexta-feira</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                          <SelectItem value="0">Domingo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-time">Horário</Label>
                      <Input 
                        id="schedule-time"
                        type="time"
                        value={editingAutomation.schedule?.time || ""}
                        onChange={(e) => updateFormValue("schedule", { 
                          ...editingAutomation.schedule, 
                          time: e.target.value 
                        })}
                      />
                    </div>
                  </>
                )}

                {editingAutomation.schedule?.type === "monthly" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-day">Dia do Mês</Label>
                      <Input 
                        id="schedule-day"
                        type="number"
                        min="1"
                        max="31"
                        value={editingAutomation.schedule?.dayOfMonth || "1"}
                        onChange={(e) => updateFormValue("schedule", { 
                          ...editingAutomation.schedule, 
                          dayOfMonth: parseInt(e.target.value) 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-time">Horário</Label>
                      <Input 
                        id="schedule-time"
                        type="time"
                        value={editingAutomation.schedule?.time || ""}
                        onChange={(e) => updateFormValue("schedule", { 
                          ...editingAutomation.schedule, 
                          time: e.target.value 
                        })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="response-content">Mensagem Agendada</Label>
                  <Textarea 
                    id="response-content"
                    value={editingAutomation.response?.content || ""}
                    onChange={(e) => updateFormValue("response", { content: e.target.value })}
                    placeholder="Digite a mensagem que será enviada no horário agendado"
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-gray-500">
                    Você pode usar as variáveis: {'{nome}'}, {'{email}'}, {'{telefone}'} para personalização.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-targets">Destinatários</Label>
                  <Select 
                    value={editingAutomation.schedule?.targetType || "all"}
                    onValueChange={(value) => updateFormValue("schedule", { 
                      ...editingAutomation.schedule, 
                      targetType: value 
                    })}
                  >
                    <SelectTrigger id="schedule-targets">
                      <SelectValue placeholder="Selecione os destinatários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os contatos</SelectItem>
                      <SelectItem value="segment">Segmento específico</SelectItem>
                      <SelectItem value="conversations">Conversas ativas</SelectItem>
                    </SelectContent>
                  </Select>
                  {editingAutomation.schedule?.targetType === "segment" && (
                    <Input 
                      placeholder="Nome do segmento (ex: clientes-vip)"
                      value={editingAutomation.schedule?.segment || ""}
                      onChange={(e) => updateFormValue("schedule", { 
                        ...editingAutomation.schedule, 
                        segment: e.target.value 
                      })}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <AppShell title="Automações">
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Automações e Chatbots"
          description="Gerencie automações, respostas rápidas e chatbots inteligentes para todas as suas conversas."
          actions={
            <Button onClick={handleNewAutomation}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Automação
            </Button>
          }
        />

      <div className="flex items-center justify-between">
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="quick_reply">Respostas Rápidas</TabsTrigger>
            <TabsTrigger value="chatbot">Chatbots</TabsTrigger>
            <TabsTrigger value="trigger">Gatilhos</TabsTrigger>
            <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Input
            placeholder="Buscar automações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[250px]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[150px]">Tipo</TableHead>
              <TableHead className="w-[150px]">Provedor</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[150px]">Última execução</TableHead>
              <TableHead className="w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    Carregando automações...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAutomations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {searchTerm ? (
                    <>Nenhuma automação encontrada com o termo "{searchTerm}".</>
                  ) : selectedTab !== "all" ? (
                    <>Nenhuma automação do tipo "{getAutomationTypeLabel(selectedTab)}" encontrada.</>
                  ) : (
                    <>Nenhuma automação encontrada. Clique em "Nova Automação" para criar.</>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredAutomations.map((automation) => (
                <TableRow key={automation.id}>
                  <TableCell>{automation.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{automation.name}</div>
                    {automation.description && (
                      <div className="text-sm text-gray-500 truncate max-w-[300px]">
                        {automation.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getAutomationTypeIcon(automation.type)}
                      {getAutomationTypeLabel(automation.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getModelProviderLabel(automation.modelProvider)}
                  </TableCell>
                  <TableCell>
                    <Badge className={automation.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                      {automation.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {automation.lastExecutedAt ? (
                      new Date(automation.lastExecutedAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : (
                      <span className="text-gray-500">Nunca executada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditAutomation(automation)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleExecuteAutomation(automation)}
                        title="Executar manualmente"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteAutomation(automation.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de edição/criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>{isNew ? "Criar nova automação" : "Editar automação"}</DialogTitle>
            <DialogDescription>
              {isNew 
                ? "Configure as propriedades da nova automação e clique em Salvar." 
                : "Modifique as propriedades da automação e clique em Salvar para aplicar as alterações."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name"
                  value={editingAutomation.name}
                  onChange={(e) => updateFormValue("name", e.target.value)}
                  placeholder="Nome da automação"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={editingAutomation.type}
                  onValueChange={(value) => updateFormValue("type", value)}
                  disabled={!isNew} // Não permitir alterar o tipo após criação
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {automationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isNew && (
                  <p className="text-xs text-gray-500">
                    O tipo não pode ser alterado após a criação.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description"
                value={editingAutomation.description}
                onChange={(e) => updateFormValue("description", e.target.value)}
                placeholder="Descrição da automação (opcional)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="is-active"
                checked={editingAutomation.isActive}
                onCheckedChange={(checked) => updateFormValue("isActive", checked)}
              />
              <Label htmlFor="is-active">Automação ativa</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Configuração de {getAutomationTypeLabel(editingAutomation.type)}</h3>
              {renderFormByType()}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAutomation}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppShell>
  );
}