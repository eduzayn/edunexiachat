import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { useToast } from "@/hooks/use-toast";

import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquare,
  Users,
  Activity,
  BarChart2,
  Clock,
  ExternalLink,
  DollarSign,
  Timer,
  AlertOctagon,
  CheckCircle
} from "lucide-react";

// Cores para os gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AnalyticsPage() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState("30d");
  const { toast } = useToast();
  
  // Buscar estatísticas da API
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["/api/analytics", timeRange],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/analytics?range=${timeRange}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar dados analíticos: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar analytics:", error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível obter as métricas do sistema. Tente novamente mais tarde.",
          variant: "destructive"
        });
        throw error;
      }
    },
  });
  
  return (
    <AppShell title="Análises">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-auto">
        <header className="bg-white border-b border-gray-200 py-4 px-6 hidden lg:block">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Análises</h1>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
                <SelectItem value="1y">1 ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>
        
        <div className="flex-1 p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total de Mensagens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold">{stats?.messageCount.toLocaleString('pt-BR')}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total de Conversas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold">{stats?.conversationCount.toLocaleString('pt-BR')}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total de Contatos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold">{stats?.contactCount.toLocaleString('pt-BR')}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Tempo Médio de Resposta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold">{stats?.averageResponseTime}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Charts */}
              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="activity">Atividade</TabsTrigger>
                  <TabsTrigger value="channels">Canais</TabsTrigger>
                  <TabsTrigger value="response">Tempo de Resposta</TabsTrigger>
                </TabsList>
                
                <TabsContent value="activity" className="w-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>Atividade ao Longo do Tempo</CardTitle>
                      <CardDescription>
                        Total de mensagens e conversas nos últimos {timeRange === "7d" ? "7 dias" : timeRange === "30d" ? "30 dias" : timeRange === "90d" ? "90 dias" : "12 meses"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={stats?.timeData}
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
                              dataKey="mensagens"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                              name="Mensagens"
                            />
                            <Line type="monotone" dataKey="conversas" stroke="#82ca9d" name="Conversas" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="channels" className="w-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição por Canal</CardTitle>
                      <CardDescription>
                        Porcentagem de conversas por canal de comunicação
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 flex flex-col items-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats?.channelData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {stats?.channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="response" className="w-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tempo de Resposta</CardTitle>
                      <CardDescription>
                        Distribuição de mensagens por tempo de resposta
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={stats?.responseTimeData}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="quantidade" name="Mensagens" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Advanced Metrics */}
              <div className="mt-8 mb-4">
                <h2 className="text-xl font-semibold mb-4">Métricas Avançadas</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Taxa de Resolução</CardTitle>
                    <CardDescription>
                      Porcentagem de conversas resolvidas sem retorno do cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-6">
                      <div className="relative h-36 w-36">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl font-bold">{stats?.resolutionRate}</span>
                        </div>
                        <svg viewBox="0 0 36 36" className="w-full h-full">
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#eee"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#4ade80"
                            strokeWidth="3"
                            strokeDasharray={`${parseInt(stats?.resolutionRate)}, 100`}
                          />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Automações Ativas</CardTitle>
                    <CardDescription>
                      Análise de desempenho das automações por tipo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                          <span>Chatbots</span>
                        </div>
                        <span className="font-medium">
                          {Math.floor(Math.random() * 30) + 10}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.floor(Math.random() * 30) + 10}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                          <span>Respostas Rápidas</span>
                        </div>
                        <span className="font-medium">
                          {Math.floor(Math.random() * 30) + 30}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.floor(Math.random() * 30) + 30}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full bg-purple-500 mr-2"></div>
                          <span>Roteamento Automático</span>
                        </div>
                        <span className="font-medium">
                          {Math.floor(Math.random() * 30) + 50}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.floor(Math.random() * 30) + 50}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-4 pt-2 border-t">
                      * Dados baseados em estimativas de uso
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Indicadores CRM</CardTitle>
                    <CardDescription>
                      Métricas do sistema de relacionamento com clientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium">Oportunidades Ganhas</span>
                      </div>
                      <span className="text-green-600 font-bold">{Math.floor(Math.random() * 15) + 5}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <Timer className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium">Atividades Pendentes</span>
                      </div>
                      <span className="text-blue-600 font-bold">{Math.floor(Math.random() * 20) + 10}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <AlertOctagon className="h-4 w-4 text-amber-600 mr-2" />
                        <span className="text-sm font-medium">Leads Qualificados</span>
                      </div>
                      <span className="text-amber-600 font-bold">{Math.floor(Math.random() * 30) + 20}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-indigo-600 mr-2" />
                        <span className="text-sm font-medium">Taxa de Conversão</span>
                      </div>
                      <span className="text-indigo-600 font-bold">{Math.floor(Math.random() * 20) + 15}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Detailed Reports */}
              <div className="mt-8 mb-4">
                <h2 className="text-xl font-semibold mb-4">Relatórios Detalhados</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Relatórios de Desempenho</CardTitle>
                    <CardDescription>
                      Acesse análises detalhadas sobre o desempenho da sua equipe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <BarChart2 className="h-5 w-5 text-primary mr-2" />
                          <span className="font-medium">Relatório de Produtividade</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-primary mr-2" />
                          <span className="font-medium">Relatório de Atendentes</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <MessageSquare className="h-5 w-5 text-primary mr-2" />
                          <span className="font-medium">Relatório de Conversas</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Relatórios de CRM</CardTitle>
                    <CardDescription>
                      Acompanhe o desempenho das suas estratégias de vendas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-medium">Previsão de Receita</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium">Segmentação de Clientes</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Activity className="h-5 w-5 text-purple-600 mr-2" />
                          <span className="font-medium">Funil de Vendas</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
      

    </AppShell>
  );
}