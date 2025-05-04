import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { AlertTriangle, BarChart, Database, RefreshCw, Trash } from "lucide-react";
import { Redirect } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Tipo para estatísticas de cache
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  flushCount: number;
  lastFlush: string | null;
  hitRate?: string;
}

// Página de administração do cache
export default function CacheAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  
  // Verificar se o usuário é administrador
  if (!user || user.role !== "admin") {
    toast({
      title: "Acesso negado",
      description: "Você não tem permissão para acessar esta página",
      variant: "destructive",
    });
    return <Redirect to="/" />;
  }
  
  // Buscar estatísticas de cache
  const { 
    data: cacheStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery<{ stats: CacheStats, hitRate: string }>({
    queryKey: ["/api/admin/cache/stats"],
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
  
  // Buscar estatísticas gerais do sistema
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery<any>({
    queryKey: ["/api/_debug/metrics"],
    enabled: process.env.NODE_ENV === "development",
  });
  
  // Mutação para limpar todo o cache
  const flushCacheMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cache/flush");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "O cache foi limpo com sucesso",
      });
      // Recarrega os dados
      refetchStats();
      refetchMetrics();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao limpar cache",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para limpar um namespace específico
  const clearNamespaceMutation = useMutation({
    mutationFn: async (namespace: string) => {
      const res = await apiRequest("POST", `/api/admin/cache/namespace/${namespace}/clear`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Namespace limpo",
        description: `O namespace "${selectedNamespace}" foi limpo com sucesso`,
      });
      // Recarrega os dados
      refetchStats();
      refetchMetrics();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao limpar namespace",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Lista de namespaces conhecidos
  const namespaces = [
    "users",
    "conversations",
    "messages",
    "contacts",
    "templates",
    "channels",
    "metrics",
    "routing",
    "automations"
  ];
  
  // Formatar bytes para exibição
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else return (bytes / 1048576).toFixed(2) + " MB";
  };
  
  // Renderiza a média de tempo de consulta
  const renderQueryTimeAverage = () => {
    if (!metrics || !metrics.database || !metrics.database.queryPatterns) return "N/A";
    
    let totalTime = 0;
    let totalQueries = 0;
    
    metrics.database.queryPatterns.forEach((pattern: any) => {
      totalTime += (pattern.avgDurationMs * pattern.count);
      totalQueries += pattern.count;
    });
    
    if (totalQueries === 0) return "N/A";
    
    return (totalTime / totalQueries).toFixed(2) + " ms";
  };
  
  // Função para lidar com limpeza de namespace
  const handleClearNamespace = () => {
    if (!selectedNamespace) {
      toast({
        title: "Selecione um namespace",
        description: "Você precisa selecionar um namespace para limpar",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Tem certeza que deseja limpar o namespace "${selectedNamespace}"?`)) {
      clearNamespaceMutation.mutate(selectedNamespace);
    }
  };
  
  // Função para lidar com limpeza total do cache
  const handleFlushCache = () => {
    if (confirm("Tem certeza que deseja limpar todo o cache? Esta ação não pode ser desfeita.")) {
      flushCacheMutation.mutate();
    }
  };
  
  return (
    <AppShell>
      <div className="container py-6">
        <PageHeader
          title="Administração do Cache"
          description="Monitore e gerencie o sistema de cache da aplicação"
          icon={<Database className="h-6 w-6 mr-2" />}
        />
        
        <Tabs defaultValue="dashboard" className="mt-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="management">Gerenciamento</TabsTrigger>
            {process.env.NODE_ENV === "development" && (
              <TabsTrigger value="diagnostics">Diagnósticos</TabsTrigger>
            )}
          </TabsList>
          
          {/* Dashboard do Cache */}
          <TabsContent value="dashboard" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card de Estatísticas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Estatísticas do Cache</CardTitle>
                  <CardDescription>Visão geral do uso do sistema de cache</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoadingStats ? (
                    <div className="flex items-center justify-center h-20">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Carregando estatísticas...</span>
                    </div>
                  ) : statsError ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>
                        Não foi possível carregar as estatísticas do cache
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm">Taxa de Acerto:</span>
                        <Badge variant="outline" className="font-mono">
                          {cacheStats?.hitRate || "0.00%"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Acertos:</span>
                        <span className="font-mono">{cacheStats?.stats.hits.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Falhas:</span>
                        <span className="font-mono">{cacheStats?.stats.misses.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Itens Armazenados:</span>
                        <span className="font-mono">{cacheStats?.stats.size.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Limpezas Totais:</span>
                        <span className="font-mono">{cacheStats?.stats.flushCount || "0"}</span>
                      </div>
                      {cacheStats?.stats.lastFlush && (
                        <div className="flex justify-between">
                          <span className="text-sm">Última Limpeza:</span>
                          <span className="font-mono">
                            {new Date(cacheStats.stats.lastFlush).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => refetchStats()}
                    disabled={isLoadingStats}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Card de Desempenho */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Desempenho do Sistema</CardTitle>
                  <CardDescription>Impacto do cache no desempenho</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-20">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Carregando métricas...</span>
                    </div>
                  ) : metricsError || !metrics ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>
                        Não foi possível carregar as métricas de desempenho
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm">Tempo Médio de Resposta:</span>
                        <Badge variant="outline" className="font-mono">
                          {metrics.performance.avgResponseTime || "0"} ms
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tempo Médio de Consulta:</span>
                        <span className="font-mono">{renderQueryTimeAverage()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Consultas por Segundo:</span>
                        <span className="font-mono">{metrics.performance.requestsPerSecond || "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Uso de Memória:</span>
                        <span className="font-mono">{metrics.performance.memoryUsage.heapUsed || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Requisições Totais:</span>
                        <span className="font-mono">{metrics.performance.requestCount.toLocaleString() || "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tempo de Atividade:</span>
                        <span className="font-mono">
                          {Math.floor(metrics.performance.uptime / 60)} min {metrics.performance.uptime % 60} seg
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => refetchMetrics()}
                    disabled={isLoadingMetrics}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMetrics ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Card de Ações Rápidas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Ações Rápidas</CardTitle>
                  <CardDescription>Gerenciamento do cache do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Limpar Cache</div>
                    <div className="text-sm text-muted-foreground">
                      Limpa todo o cache do sistema. Esta ação não pode ser desfeita.
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleFlushCache}
                      disabled={flushCacheMutation.isPending}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Limpar Todo o Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Gerenciamento de Cache */}
          <TabsContent value="management" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento por Namespace</CardTitle>
                <CardDescription>
                  Limpe o cache por namespace para otimizar o sistema sem interromper todo o serviço
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="namespace" className="text-sm font-medium">
                      Selecione o Namespace
                    </label>
                    <select
                      id="namespace"
                      className="w-full p-2 border rounded-md"
                      value={selectedNamespace}
                      onChange={(e) => setSelectedNamespace(e.target.value)}
                    >
                      <option value="">Selecione um namespace</option>
                      {namespaces.map((namespace) => (
                        <option key={namespace} value={namespace}>
                          {namespace}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Descrição dos Namespaces</h3>
                    <div className="text-sm text-muted-foreground">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>users</strong>: Informações de usuários do sistema</li>
                        <li><strong>conversations</strong>: Conversas e seus metadados</li>
                        <li><strong>messages</strong>: Mensagens individuais das conversas</li>
                        <li><strong>contacts</strong>: Contatos e informações de clientes</li>
                        <li><strong>templates</strong>: Templates de mensagens predefinidas</li>
                        <li><strong>channels</strong>: Canais de comunicação configurados</li>
                        <li><strong>metrics</strong>: Métricas e estatísticas de desempenho</li>
                        <li><strong>routing</strong>: Regras de roteamento de conversas</li>
                        <li><strong>automations</strong>: Configurações de automações</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClearNamespace}
                  disabled={clearNamespaceMutation.isPending || !selectedNamespace}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Limpar Namespace Selecionado
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Diagnósticos (apenas em ambiente de desenvolvimento) */}
          {process.env.NODE_ENV === "development" && (
            <TabsContent value="diagnostics" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Diagnóstico Detalhado</CardTitle>
                  <CardDescription>
                    Informações detalhadas para diagnóstico do sistema (apenas em ambiente de desenvolvimento)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Dados Brutos de Diagnóstico</h3>
                      <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto">
                        <pre className="text-xs">
                          {JSON.stringify(metrics, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    {metrics?.database?.recentSlowQueries?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Consultas Lentas Recentes</h3>
                        <div className="space-y-2">
                          {metrics.database.recentSlowQueries.map((query: any, index: number) => (
                            <div key={index} className="bg-slate-100 p-3 rounded-md text-xs">
                              <div className="font-mono mb-1 text-secondary">{query.durationMs.toFixed(2)} ms</div>
                              <div className="font-mono break-all whitespace-pre-wrap">{query.query}</div>
                              <div className="text-slate-500 mt-1">
                                {new Date(query.timestamp).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}