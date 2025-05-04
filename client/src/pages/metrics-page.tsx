import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Clock,
  MessageSquareText,
  Users,
  Award,
  CheckCircle,
  XCircle,
  Percent,
  PieChart,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Interface para os dados de desempenho dos agentes
interface AgentPerformance {
  id: number;
  userId: number;
  date: string;
  averageResponseTimeMs: number | null;
  averageFirstResponseTimeMs: number | null;
  conversationsAssigned: number;
  conversationsResolved: number;
  messagesReceived: number;
  messagesSent: number;
  satisfactionRating: number | null;
  satisfactionResponseRate: number | null;
  missedSessions: number;
  transferredSessions: number;
  automationUsageCount: number;
  weekNumber: number;
  monthNumber: number;
  year: number;
  utilizationRate: number | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
}

// Interface para os dados de pesquisas de satisfação
interface SatisfactionSurvey {
  id: number;
  conversationId: number;
  userId: number;
  rating: number;
  feedback: string | null;
  source: string;
  status: string;
  createdAt: string;
  userName?: string;
}

// Helper para operações reduce seguras em todo o componente
const safeReduce = (array: any[] | null | undefined, callback: (acc: any, item: any) => any, initialValue: any): any => {
  if (!array || !Array.isArray(array)) return initialValue;
  return array.reduce(callback, initialValue);
};

export default function MetricsPage() {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState("7days");
  const [activeTab, setActiveTab] = useState("performance");
  const [selectedUser, setSelectedUser] = useState<string>("all");

  // Calcula as datas com base no timeframe selecionado
  const getDateRange = () => {
    const endDate = new Date();
    let startDate;
    
    switch(timeframe) {
      case "7days":
        startDate = subDays(endDate, 7);
        break;
      case "30days":
        startDate = subDays(endDate, 30);
        break;
      case "90days":
        startDate = subDays(endDate, 90);
        break;
      case "month":
        startDate = startOfMonth(endDate);
        endDate.setTime(endOfMonth(endDate).getTime());
        break;
      default:
        startDate = subDays(endDate, 7);
    }
    
    return { startDate, endDate };
  };

  // Busca os dados de desempenho dos agentes
  const { 
    data: performanceResponse, 
    isLoading: loadingPerformance, 
    isError: errorPerformance
  } = useQuery({
    queryKey: ["/api/metrics/agent-performance", timeframe, selectedUser],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const query = new URLSearchParams();
      
      query.append("startDate", startDate.toISOString());
      query.append("endDate", endDate.toISOString());
      
      if (selectedUser !== "all") {
        query.append("userId", selectedUser);
      }
      
      const response = await fetch(`/api/metrics/agent-performance?${query.toString()}`);
      
      if (!response.ok) {
        throw new Error("Falha ao buscar dados de desempenho");
      }
      
      const result = await response.json();
      return result;
    }
  });
  
  // Extrair os dados de desempenho do response
  const performanceData = performanceResponse?.data || [];

  // Busca os dados de pesquisas de satisfação
  const { 
    data: surveyResponse, 
    isLoading: loadingSurveys, 
    isError: errorSurveys
  } = useQuery({
    queryKey: ["/api/metrics/satisfaction-surveys", timeframe, selectedUser],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const query = new URLSearchParams();
      
      query.append("startDate", startDate.toISOString());
      query.append("endDate", endDate.toISOString());
      
      if (selectedUser !== "all") {
        query.append("userId", selectedUser);
      }
      
      const response = await fetch(`/api/metrics/satisfaction-surveys?${query.toString()}`);
      
      if (!response.ok) {
        throw new Error("Falha ao buscar dados de satisfação");
      }
      
      const result = await response.json();
      return result;
    }
  });
  
  // Extrair os dados de pesquisas do response
  const surveyData = surveyResponse?.data || [];
  
  // Busca a lista de usuários (agentes)
  const { 
    data: users, 
    isLoading: loadingUsers 
  } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error("Falha ao buscar usuários");
      }
      
      return await response.json();
    }
  });

  // Dados de resumo, calculados com base nos dados de desempenho
  const getSummaryData = () => {
    // Verificar se performanceData é um array e se tem itens
    if (!performanceData || !Array.isArray(performanceData) || performanceData.length === 0) {
      return {
        averageResponseTimeMs: 0,
        totalConversations: 0,
        resolvedConversations: 0,
        satisfactionRating: 0,
        totalMessages: 0
      };
    }

    // Calcula médias e totais
    const totalEntries = Array.isArray(performanceData) ? performanceData.length : 0;
    
    // Helper para operações reduce seguras
    const safeReduce = (array: any[] | null | undefined, callback: (acc: number, item: any) => number): number => {
      if (!array || !Array.isArray(array)) return 0;
      return array.reduce(callback, 0);
    };
    
    const totalResponseTime = safeReduce(performanceData, (acc, item) => 
      acc + (item && item.averageResponseTimeMs ? item.averageResponseTimeMs : 0));
      
    const totalConversations = safeReduce(performanceData, (acc, item) => 
      acc + (item && item.conversationsAssigned ? item.conversationsAssigned : 0));
      
    const resolvedConversations = safeReduce(performanceData, (acc, item) => 
      acc + (item && item.conversationsResolved ? item.conversationsResolved : 0));
      
    const totalSatisfactionRating = safeReduce(performanceData, (acc, item) => 
      acc + (item && item.satisfactionRating ? item.satisfactionRating : 0));
      
    const totalMessages = safeReduce(performanceData, (acc, item) => 
      acc + ((item && item.messagesReceived ? item.messagesReceived : 0) + 
             (item && item.messagesSent ? item.messagesSent : 0)));
    
    // Calcula as médias - com verificação de array
    const entriesWithRating = Array.isArray(performanceData) ? 
      performanceData.filter(item => item && item.satisfactionRating !== null).length : 0;
    const averageSatisfaction = entriesWithRating > 0 
      ? totalSatisfactionRating / entriesWithRating 
      : 0;
    
    const entriesWithResponseTime = Array.isArray(performanceData) ? 
      performanceData.filter(item => item && item.averageResponseTimeMs !== null).length : 0;
    const averageResponseTime = entriesWithResponseTime > 0 
      ? totalResponseTime / entriesWithResponseTime 
      : 0;
    
    return {
      averageResponseTimeMs: Math.round(averageResponseTime),
      totalConversations,
      resolvedConversations,
      satisfactionRating: parseFloat(averageSatisfaction.toFixed(1)),
      totalMessages
    };
  };

  // Prepara os dados para o gráfico de desempenho de resposta
  const getResponseTimeChartData = () => {
    if (!performanceData || !Array.isArray(performanceData) || performanceData.length === 0) return [];
    
    return performanceData.map(item => ({
      date: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
      "Tempo médio de resposta": item && item.averageResponseTimeMs ? Math.round(item.averageResponseTimeMs / 1000) : 0,
      "Tempo médio da primeira resposta": item && item.averageFirstResponseTimeMs ? Math.round(item.averageFirstResponseTimeMs / 1000) : 0,
    }));
  };

  // Prepara os dados para o gráfico de volume de conversas
  const getConversationVolumeChartData = () => {
    if (!performanceData || !Array.isArray(performanceData) || performanceData.length === 0) return [];
    
    return performanceData.map(item => ({
      date: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
      "Atribuídas": item && item.conversationsAssigned ? item.conversationsAssigned : 0,
      "Resolvidas": item && item.conversationsResolved ? item.conversationsResolved : 0,
    }));
  };

  // Prepara os dados para o gráfico de satisfação
  const getSatisfactionChartData = () => {
    if (!surveyData || !Array.isArray(surveyData) || surveyData.length === 0) return [];

    // Helper para operações reduce seguras (escopo global)
    const safeReduce = (array: any[] | null | undefined, callback: (acc: any, item: any) => any, initialValue: any): any => {
      if (!array || !Array.isArray(array)) return initialValue;
      return array.reduce(callback, initialValue);
    };

    // Agrupa as pesquisas por rating
    const ratingCounts = safeReduce(surveyData, (acc, survey) => {
      const rating = survey && survey.rating ? survey.rating : 0;
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return [1, 2, 3, 4, 5].map(rating => ({
      rating: `${rating} estrela${rating !== 1 ? 's' : ''}`,
      quantidade: ratingCounts[rating] || 0
    }));
  };

  // Função para renderizar indicadores de variação para os KPIs
  const renderTrend = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUpIcon className="h-4 w-4 mr-1" />
          <span>{value}%</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDownIcon className="h-4 w-4 mr-1" />
          <span>{Math.abs(value)}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-600">
          <ArrowRightIcon className="h-4 w-4 mr-1" />
          <span>0%</span>
        </div>
      );
    }
  };

  // Obtém o resumo dos dados
  const summaryData = getSummaryData();

  // Renderiza o conteúdo principal da página
  return (
    <AppShell>
      <div className="container py-6 space-y-8">
        <PageHeader 
          title="Métricas de Desempenho" 
          description="Monitore o desempenho dos agentes e a satisfação dos clientes em tempo real."
        />

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select 
                value={timeframe} 
                onValueChange={setTimeframe}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="month">Mês atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-48">
              <Select 
                value={selectedUser} 
                onValueChange={setSelectedUser}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os agentes</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => {
            toast({
              title: "Relatório gerado",
              description: "O relatório foi exportado com sucesso.",
            });
          }}>
            Exportar Relatório
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Tempo Médio de Resposta
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">
                    {summaryData.averageResponseTimeMs 
                      ? `${Math.round(summaryData.averageResponseTimeMs / 1000)}s` 
                      : "N/A"}
                  </div>
                  {renderTrend(5)} {/* Valor fixo para demonstração */}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center">
                  <MessageSquareText className="h-4 w-4 mr-2" />
                  Total de Conversas
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">
                    {summaryData.totalConversations}
                  </div>
                  {renderTrend(12)} {/* Valor fixo para demonstração */}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Taxa de Resolução
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">
                    {summaryData.totalConversations > 0 
                      ? `${Math.round((summaryData.resolvedConversations / summaryData.totalConversations) * 100)}%` 
                      : "0%"}
                  </div>
                  {renderTrend(3)} {/* Valor fixo para demonstração */}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Satisfação Média
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">
                    {`${summaryData.satisfactionRating.toFixed(1)}/5.0`}
                  </div>
                  {renderTrend(8)} {/* Valor fixo para demonstração */}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs para diferentes tipos de métricas */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="w-full sm:w-auto grid sm:inline-grid grid-cols-2 sm:grid-cols-3 mb-4">
            <TabsTrigger value="performance">Desempenho</TabsTrigger>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
          </TabsList>
          
          {/* Tab de desempenho */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Resposta (segundos)</CardTitle>
                <CardDescription>
                  Tempo médio de resposta dos agentes ao longo do período
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loadingPerformance ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : errorPerformance ? (
                  <div className="flex items-center justify-center h-full text-red-600">
                    Erro ao carregar dados. Tente novamente.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getResponseTimeChartData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Tempo médio de resposta" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Tempo médio da primeira resposta" 
                        stroke="#82ca9d" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Mensagens</CardTitle>
                  <CardDescription>
                    Total de mensagens enviadas e recebidas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPerformance ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : errorPerformance ? (
                    <div className="text-red-600">
                      Erro ao carregar dados. Tente novamente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total de mensagens:</span>
                        <Badge variant="outline" className="font-medium">
                          {summaryData.totalMessages}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Mensagens por conversa (média):</span>
                        <Badge variant="outline" className="font-medium">
                          {summaryData.totalConversations > 0 
                            ? Math.round(summaryData.totalMessages / summaryData.totalConversations) 
                            : 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Utilização de automações:</span>
                        <Badge variant="outline" className="font-medium">
                          {safeReduce(performanceData, (acc, item) => 
                            acc + (item && item.automationUsageCount ? item.automationUsageCount : 0), 0)}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Utilização</CardTitle>
                  <CardDescription>
                    Taxa de utilização e eficiência dos agentes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPerformance ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : errorPerformance ? (
                    <div className="text-red-600">
                      Erro ao carregar dados. Tente novamente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Taxa de utilização média:</span>
                        <Badge variant="outline" className="font-medium">
                          {performanceData && performanceData.length > 0
                            ? `${Math.round(performanceData.reduce((acc, item) => 
                                acc + (item.utilizationRate || 0), 0) / 
                                performanceData.filter(item => item.utilizationRate !== null).length
                              )}%`
                            : "0%"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Sessões transferidas:</span>
                        <Badge variant="outline" className="font-medium">
                          {safeReduce(performanceData, (acc, item) => 
                            acc + (item && item.transferredSessions ? item.transferredSessions : 0), 0)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Sessões perdidas:</span>
                        <Badge variant="outline" className="font-medium text-red-500">
                          {safeReduce(performanceData, (acc, item) => 
                            acc + (item && item.missedSessions ? item.missedSessions : 0), 0)}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tab de conversas */}
          <TabsContent value="conversations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Volume de Conversas</CardTitle>
                <CardDescription>
                  Total de conversas atribuídas e resolvidas ao longo do período
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loadingPerformance ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : errorPerformance ? (
                  <div className="flex items-center justify-center h-full text-red-600">
                    Erro ao carregar dados. Tente novamente.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getConversationVolumeChartData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Atribuídas" fill="#8884d8" />
                      <Bar dataKey="Resolvidas" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Resolução</CardTitle>
                  <CardDescription>
                    Porcentagem de conversas resolvidas em relação às atribuídas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-10">
                    {loadingPerformance ? (
                      <Skeleton className="h-32 w-32 rounded-full" />
                    ) : errorPerformance ? (
                      <div className="text-red-600">
                        Erro ao carregar dados. Tente novamente.
                      </div>
                    ) : (
                      <>
                        <div className="relative h-32 w-32">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-3xl font-bold">
                              {summaryData.totalConversations > 0 
                                ? `${Math.round((summaryData.resolvedConversations / summaryData.totalConversations) * 100)}%` 
                                : "0%"}
                            </div>
                          </div>
                          <Percent className="h-32 w-32 text-primary/20" />
                        </div>
                        <div className="mt-4 text-center">
                          <div className="text-muted-foreground">
                            {summaryData.resolvedConversations} de {summaryData.totalConversations} conversas resolvidas
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes das Conversas</CardTitle>
                  <CardDescription>
                    Informações detalhadas sobre o volume de conversas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPerformance ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : errorPerformance ? (
                    <div className="text-red-600">
                      Erro ao carregar dados. Tente novamente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <UserCheck className="h-4 w-4 mr-2" />
                          <span className="font-medium">Média diária:</span>
                        </span>
                        <Badge variant="outline" className="font-medium">
                          {performanceData && performanceData.length > 0
                            ? Math.round(summaryData.totalConversations / performanceData.length)
                            : 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <PieChart className="h-4 w-4 mr-2" />
                          <span className="font-medium">Conversas não resolvidas:</span>
                        </span>
                        <Badge variant="outline" className="font-medium">
                          {summaryData.totalConversations - summaryData.resolvedConversations}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="font-medium">Agentes ativos:</span>
                        </span>
                        <Badge variant="outline" className="font-medium">
                          {selectedUser === "all" && performanceData && Array.isArray(performanceData)
                            ? new Set(performanceData.map(item => item.userId)).size
                            : selectedUser !== "all" ? 1 : 0}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tab de satisfação */}
          <TabsContent value="satisfaction" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição da Satisfação</CardTitle>
                <CardDescription>
                  Distribuição das avaliações de satisfação por classificação
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loadingSurveys ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : errorSurveys ? (
                  <div className="flex items-center justify-center h-full text-red-600">
                    Erro ao carregar dados. Tente novamente.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getSatisfactionChartData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#8884d8" name="Quantidade de avaliações" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback dos Clientes</CardTitle>
                  <CardDescription>
                    Comentários recentes dos clientes sobre o atendimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSurveys ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : errorSurveys ? (
                    <div className="text-red-600">
                      Erro ao carregar dados. Tente novamente.
                    </div>
                  ) : !surveyData || !Array.isArray(surveyData) || surveyData.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum feedback disponível para o período selecionado.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-auto pr-2">
                      {Array.isArray(surveyData) ? 
                        surveyData
                          .filter(survey => survey && survey.feedback)
                          .slice(0, 5)
                          .map(survey => (
                            <div key={survey.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={survey.rating >= 4 ? "success" : survey.rating >= 3 ? "warning" : "destructive"}>
                                    {survey.rating}/5
                                  </Badge>
                                  <span className="text-sm font-medium">{survey.userName || "Cliente"}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(parseISO(survey.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              </div>
                              <p className="text-sm">{survey.feedback}</p>
                            </div>
                          ))
                        : null}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Satisfação</CardTitle>
                  <CardDescription>
                    Resumo das métricas de satisfação do cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSurveys ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : errorSurveys ? (
                    <div className="text-red-600">
                      Erro ao carregar dados. Tente novamente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total de avaliações:</span>
                        <Badge variant="outline" className="font-medium">
                          {surveyData && Array.isArray(surveyData) ? surveyData.length : 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Taxa de resposta:</span>
                        <Badge variant="outline" className="font-medium">
                          {summaryData.totalConversations > 0 
                            ? `${Math.round(((surveyData && Array.isArray(surveyData) ? surveyData.length : 0) / summaryData.totalConversations) * 100)}%` 
                            : "0%"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Avaliações positivas (4-5):</span>
                        <Badge variant="outline" className="font-medium text-green-600">
                          {surveyData && Array.isArray(surveyData)
                            ? surveyData.filter(survey => survey && survey.rating >= 4).length
                            : 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Avaliações negativas (1-2):</span>
                        <Badge variant="outline" className="font-medium text-red-600">
                          {surveyData && Array.isArray(surveyData)
                            ? surveyData.filter(survey => survey && survey.rating <= 2).length
                            : 0}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}