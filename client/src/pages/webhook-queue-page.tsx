import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

// Componentes UI
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, BarChart4, LineChart, Loader2, RefreshCw, RotateCcw, Table2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipos
type WebhookQueueItem = {
  id: number;
  source: string;
  channelId: number | null;
  payload: any;
  status: "pending" | "processing" | "failed" | "completed";
  attempts: number;
  lastError: string | null;
  processAfter: string;
  priority: number;
  tags?: string[];
  processingTimeMs?: number;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type QueueStatus = {
  pending: number;
  processing: number;
  failed: number;
  isProcessing: boolean;
};

type QueueStats = {
  source: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTimeMs: number | null;
};

type PerformanceMetrics = {
  processingTimes: { source: string, avgTimeMs: number }[];
  throughput: { date: string, count: number }[];
  failureRate: { source: string, rate: number }[];
};

type ProcessingStats = {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  uptime: number;
  avgProcessingTime: number;
  criticalErrors: number;
};

export default function WebhookQueuePage() {
  const { toast } = useToast();
  const [cleanupDays, setCleanupDays] = useState(7);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WebhookQueueItem | null>(null);
  const [isPayloadDialogOpen, setIsPayloadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "failed" | "stats" | "performance">("pending");
  const [isRebalanceDialogOpen, setIsRebalanceDialogOpen] = useState(false);

  // Buscar status da fila
  const { data: queueStatus, isLoading: isLoadingStatus } = useQuery<QueueStatus>({
    queryKey: ["/api/webhook-queue/status"],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar webhooks pendentes
  const { data: pendingWebhooks, isLoading: isLoadingPending } = useQuery({
    queryKey: ["/api/webhooks", "pending"],
    queryFn: async () => {
      return await apiRequest("/api/webhooks?status=pending");
    },
    refetchInterval: 30000,
  });

  // Buscar webhooks com falha
  const { data: failedWebhooks, isLoading: isLoadingFailed } = useQuery({
    queryKey: ["/api/webhooks", "failed"],
    queryFn: async () => {
      return await apiRequest("/api/webhooks?status=failed");
    },
    refetchInterval: 30000,
  });
  
  // Buscar estatísticas por fonte
  const { data: queueStats, isLoading: isLoadingStats } = useQuery<QueueStats[]>({
    queryKey: ["/api/webhook-queue/stats"],
    queryFn: async () => {
      return await apiRequest("/api/webhook-queue/stats");
    },
    refetchInterval: 60000, // Atualizar a cada minuto
  });
  
  // Buscar métricas de performance
  const { data: performanceMetrics, isLoading: isLoadingPerformance } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/webhook-queue/performance"],
    queryFn: async () => {
      return await apiRequest("/api/webhook-queue/performance");
    },
    refetchInterval: 60000, // Atualizar a cada minuto
    enabled: activeTab === "performance", // Só buscar quando a aba de performance estiver ativa
  });
  
  // Buscar estatísticas de processamento
  const { data: processingStats, isLoading: isLoadingProcessingStats } = useQuery<ProcessingStats>({
    queryKey: ["/api/webhook-queue/processing-stats"],
    queryFn: async () => {
      return await apiRequest("/api/webhook-queue/processing-stats");
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
  
  // Mutação para rebalancear a fila
  const rebalanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/webhook-queue/rebalance", {
        method: "POST"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Fila rebalanceada",
        description: `${data.count} webhooks tiveram sua prioridade ajustada.`,
      });
      setIsRebalanceDialogOpen(false);
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-queue/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao rebalancear fila",
        description: error.message || "Ocorreu um erro ao rebalancear a fila.",
        variant: "destructive",
      });
    }
  });

  // Mutação para limpar webhooks antigos
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/webhook-queue/cleanup", {
        method: "POST",
        data: { maxAgeInDays: cleanupDays }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Limpeza concluída",
        description: data.message,
      });
      setIsCleanupDialogOpen(false);
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-queue/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao limpar fila",
        description: error.message || "Ocorreu um erro ao limpar os webhooks antigos.",
        variant: "destructive",
      });
    }
  });

  // Mutação para reprocessar um webhook
  const retryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/webhook-queue/${id}/retry`, {
        method: "POST"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook agendado",
        description: data.message,
      });
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-queue/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reprocessar",
        description: error.message || "Ocorreu um erro ao reprocessar o webhook.",
        variant: "destructive",
      });
    }
  });

  // Formatador para datas
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  // Determina cor do badge com base no status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pendente</Badge>;
      case "processing":
        return <Badge variant="secondary">Processando</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      case "completed":
        return <Badge>Concluído</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Determina cor do source badge
  const getSourceBadge = (source: string) => {
    const sourceColors: Record<string, string> = {
      "twilio": "bg-purple-100 text-purple-800",
      "twilio-sms": "bg-indigo-100 text-indigo-800",
      "zapapi": "bg-green-100 text-green-800",
      "messenger": "bg-blue-100 text-blue-800",
      "instagram": "bg-pink-100 text-pink-800",
      "telegram": "bg-sky-100 text-sky-800",
      "sendgrid": "bg-amber-100 text-amber-800",
      "asaas": "bg-yellow-100 text-yellow-800",
      "slack": "bg-emerald-100 text-emerald-800",
      "discord": "bg-violet-100 text-violet-800",
      "whatsapp-business": "bg-teal-100 text-teal-800",
      "meta": "bg-gray-100 text-gray-800",
      "test": "bg-red-100 text-red-800",
    };

    const className = sourceColors[source] || "bg-gray-100 text-gray-800";
    
    return (
      <Badge className={className} variant="outline">
        {source}
      </Badge>
    );
  };

  return (
    <AppShell title="Fila de Webhooks">
      <div className="p-6">
        <PageHeader
          title="Fila de Webhooks"
          description="Gerencie a fila de processamento de webhooks e resolva problemas de integração"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStatus ? <Loader2 className="h-6 w-6 animate-spin" /> : queueStatus?.pending || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Processamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStatus ? <Loader2 className="h-6 w-6 animate-spin" /> : queueStatus?.processing || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStatus ? <Loader2 className="h-6 w-6 animate-spin" /> : queueStatus?.failed || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estado do Processador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStatus ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Badge variant={queueStatus?.isProcessing ? "outline" : "secondary"}>
                    {queueStatus?.isProcessing ? "Processando" : "Ocioso"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsRebalanceDialogOpen(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Rebalancear
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
                queryClient.invalidateQueries({ queryKey: ["/api/webhook-queue/status"] });
                queryClient.invalidateQueries({ queryKey: ["/api/webhook-queue/stats"] });
                queryClient.invalidateQueries({ queryKey: ["/api/webhook-queue/performance"] });
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsCleanupDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Concluídos
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Tabs defaultValue="pending" className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <div className="mb-4">
              <TabsList>
                <TabsTrigger value="pending" className="flex items-center gap-1">
                  <Table2 className="h-4 w-4" />
                  Pendentes
                </TabsTrigger>
                <TabsTrigger value="failed" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Falhas
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-1">
                  <BarChart4 className="h-4 w-4" />
                  Estatísticas
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-1">
                  <LineChart className="h-4 w-4" />
                  Performance
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="pending">
            {/* Tabela de webhooks pendentes */}
            <Card>
              <CardHeader>
                <CardTitle>Webhooks Pendentes</CardTitle>
                <CardDescription>
                  Webhooks aguardando processamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPending ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingWebhooks?.length === 0 ? (
                  <Alert>
                    <AlertTitle>Nenhum pendente</AlertTitle>
                    <AlertDescription>
                      Não há webhooks pendentes no momento.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fonte</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Processamento</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWebhooks?.map((item: WebhookQueueItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{getSourceBadge(item.source)}</TableCell>
                          <TableCell>{item.priority}</TableCell>
                          <TableCell>{item.attempts}</TableCell>
                          <TableCell>{formatDate(item.processAfter)}</TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setIsPayloadDialogOpen(true);
                              }}
                            >
                              Ver Payload
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="failed">
            {/* Tabela de webhooks com falha */}
            <Card>
              <CardHeader>
                <CardTitle>Webhooks com Falha</CardTitle>
                <CardDescription>
                  Webhooks que falharam após {retryMutation.isPending ? <Loader2 className="inline h-4 w-4 animate-spin" /> : 5} tentativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFailed ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : failedWebhooks?.length === 0 ? (
                  <Alert>
                    <AlertTitle>Sem falhas</AlertTitle>
                    <AlertDescription>
                      Não há webhooks com falha no momento. Isso é uma boa notícia!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fonte</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Tempo (ms)</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedWebhooks?.map((item: WebhookQueueItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{getSourceBadge(item.source)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={item.lastError || ""}>
                            {item.lastError || "N/A"}
                          </TableCell>
                          <TableCell>{item.attempts}</TableCell>
                          <TableCell>{item.processingTimeMs || "N/A"}</TableCell>
                          <TableCell>{formatDate(item.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsPayloadDialogOpen(true);
                                }}
                              >
                                Ver Payload
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => retryMutation.mutate(item.id)}
                                disabled={retryMutation.isPending}
                              >
                                {retryMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Reprocessar"
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats">
            {/* Estatísticas por fonte */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas por Fonte</CardTitle>
                <CardDescription>
                  Visão detalhada do status atual da fila por cada fonte
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : queueStats?.length === 0 ? (
                  <Alert>
                    <AlertTitle>Sem dados</AlertTitle>
                    <AlertDescription>
                      Não há dados de estatística disponíveis no momento.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonte</TableHead>
                        <TableHead>Pendentes</TableHead>
                        <TableHead>Em Processamento</TableHead>
                        <TableHead>Concluídos</TableHead>
                        <TableHead>Falhas</TableHead>
                        <TableHead>Tempo Médio (ms)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueStats?.map((stat) => (
                        <TableRow key={stat.source}>
                          <TableCell>{getSourceBadge(stat.source)}</TableCell>
                          <TableCell>{stat.pending}</TableCell>
                          <TableCell>{stat.processing}</TableCell>
                          <TableCell>{stat.completed}</TableCell>
                          <TableCell>{stat.failed}</TableCell>
                          <TableCell>{stat.avgProcessingTimeMs !== null ? Math.round(stat.avgProcessingTimeMs) : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* Estatísticas de processamento */}
            {processingStats && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Estatísticas de Processamento</CardTitle>
                  <CardDescription>
                    Métricas de processamento desde o início do servidor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Total Processado</p>
                      <p className="text-2xl font-bold">{processingStats.totalProcessed}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Sucesso</p>
                      <p className="text-2xl font-bold">{processingStats.successCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Falhas</p>
                      <p className="text-2xl font-bold">{processingStats.failureCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Tempo de Atividade</p>
                      <p className="text-2xl font-bold">{Math.floor(processingStats.uptime / 60)}m {processingStats.uptime % 60}s</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Tempo Médio</p>
                      <p className="text-2xl font-bold">{Math.round(processingStats.avgProcessingTime)} ms</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Erros Críticos</p>
                      <p className="text-2xl font-bold">{processingStats.criticalErrors}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="performance">
            {/* Métricas de Performance */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tempos de Processamento */}
              <Card>
                <CardHeader>
                  <CardTitle>Tempo Médio de Processamento</CardTitle>
                  <CardDescription>
                    Tempo médio para processar webhooks por fonte (ms)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPerformance ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fonte</TableHead>
                            <TableHead>Tempo Médio (ms)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceMetrics?.processingTimes?.map((item) => (
                            <TableRow key={item.source}>
                              <TableCell>{getSourceBadge(item.source)}</TableCell>
                              <TableCell>{Math.round(item.avgTimeMs)}</TableCell>
                            </TableRow>
                          ))}
                          {(!performanceMetrics?.processingTimes?.length) && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                Sem dados de performance disponíveis
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Taxa de Falha */}
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Falha</CardTitle>
                  <CardDescription>
                    Percentual de webhooks que falham por fonte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPerformance ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fonte</TableHead>
                            <TableHead>Taxa de Falha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceMetrics?.failureRate?.map((item) => (
                            <TableRow key={item.source}>
                              <TableCell>{getSourceBadge(item.source)}</TableCell>
                              <TableCell>{(item.rate * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                          {(!performanceMetrics?.failureRate?.length) && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                Sem dados de taxa de falha disponíveis
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Throughput */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Throughput Diário</CardTitle>
                  <CardDescription>
                    Quantidade de webhooks processados por dia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPerformance ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Quantidade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceMetrics?.throughput?.map((item) => (
                            <TableRow key={item.date}>
                              <TableCell>{item.date}</TableCell>
                              <TableCell>{item.count}</TableCell>
                            </TableRow>
                          ))}
                          {(!performanceMetrics?.throughput?.length) && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                Sem dados de throughput disponíveis
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          </Tabs>
        </div>

        {/* Dialog para visualização de payload */}
        <Dialog open={isPayloadDialogOpen} onOpenChange={setIsPayloadDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Payload do Webhook</DialogTitle>
              <DialogDescription>
                ID: {selectedItem?.id} | Fonte: {selectedItem?.source}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                {selectedItem?.payload ? JSON.stringify(selectedItem.payload, null, 2) : ""}
              </pre>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsPayloadDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para limpeza de webhooks */}
        <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Limpar Webhooks Concluídos</DialogTitle>
              <DialogDescription>
                Você está prestes a remover webhooks concluídos mais antigos que o período especificado.
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="days">Remover webhooks concluídos mais antigos que (dias):</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    max="365"
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCleanupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
              >
                {cleanupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog para rebalanceamento da fila */}
        <Dialog open={isRebalanceDialogOpen} onOpenChange={setIsRebalanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rebalancear Fila de Webhooks</DialogTitle>
              <DialogDescription>
                Esta ação vai recalcular a prioridade dos webhooks pendentes com base na carga atual do sistema.
                Fontes com mais falhas ou processamento lento receberão prioridade mais baixa.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert>
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>
                  O rebalanceamento ajuda a otimizar o processamento quando existem múltiplas integrações com desempenho variável.
                  Use esta função quando notar um aumento na fila pendente ou falhas frequentes de um canal específico.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRebalanceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => rebalanceMutation.mutate()}
                disabled={rebalanceMutation.isPending}
              >
                {rebalanceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rebalanceando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Rebalancear Fila
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