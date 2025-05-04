import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarDays, BarChart2, MessageSquare, Users, Clock, Award } from "lucide-react";

// Interface para os dados do dashboard
interface DashboardStats {
  conversations: {
    today: number;
    weekly: number;
    monthly: number;
    total: number;
  };
  responseTimes: {
    average: number;
    firstResponse: number;
    resolution: number;
  };
  satisfaction: {
    average: number;
    total: number;
  };
  agents: {
    active: number;
    total: number;
  };
  channels: Record<string, number>;
}

interface ConversationTimeData {
  hour: string;
  count: number;
}

interface ConversationByDayData {
  day: string;
  count: number;
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<string>("semana");
  
  // Simulando a busca de dados para o dashboard
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/metrics/dashboard", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/metrics/dashboard?period=${timeRange}`);
      if (!res.ok) {
        throw new Error("Falha ao carregar dados do dashboard");
      }
      return res.json();
    }
  });

  // Dados de exemplo para os gráficos
  const conversationsByHour: ConversationTimeData[] = [
    { hour: "00h", count: 5 },
    { hour: "04h", count: 2 },
    { hour: "08h", count: 12 },
    { hour: "12h", count: 25 },
    { hour: "16h", count: 30 },
    { hour: "20h", count: 18 }
  ];

  const conversationsByDay: ConversationByDayData[] = [
    { day: "Seg", count: 40 },
    { day: "Ter", count: 35 },
    { day: "Qua", count: 55 },
    { day: "Qui", count: 65 },
    { day: "Sex", count: 50 },
    { day: "Sáb", count: 30 },
    { day: "Dom", count: 25 }
  ];

  // Dados de exemplo para os canais
  const channelData = [
    { name: "WhatsApp", value: 45 },
    { name: "Facebook", value: 25 },
    { name: "Instagram", value: 15 },
    { name: "Telegram", value: 10 },
    { name: "E-mail", value: 5 }
  ];

  return (
    <AppShell title="Dashboard">
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="trimestre">Último trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <CalendarDays className="mr-2 h-4 w-4" />
              Período Personalizado
            </Button>
          </div>
        </div>

        {/* Métricas principais em cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "-" : "32"}</div>
              <p className="text-xs text-muted-foreground">+5% em relação a ontem</p>
            </CardContent>
            <CardFooter className="pt-0">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "-" : "8.5 min"}</div>
              <p className="text-xs text-muted-foreground">-2 min em relação à semana passada</p>
            </CardContent>
            <CardFooter className="pt-0">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Satisfação do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "-" : "4.6"}</div>
              <p className="text-xs text-muted-foreground">+0.2 em relação ao mês anterior</p>
            </CardContent>
            <CardFooter className="pt-0">
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Agentes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "-" : "8/12"}</div>
              <p className="text-xs text-muted-foreground">2 ausentes hoje</p>
            </CardContent>
            <CardFooter className="pt-0">
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardFooter>
          </Card>
        </div>

        {/* Gráficos em abas */}
        <Tabs defaultValue="tempo" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="tempo">Distribuição por Hora</TabsTrigger>
            <TabsTrigger value="dias">Conversas por Dia</TabsTrigger>
            <TabsTrigger value="canais">Distribuição por Canal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tempo" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Conversas por Hora</CardTitle>
                <CardDescription>Análise de volume de conversas ao longo do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={conversationsByHour}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        name="Conversas" 
                        stroke="#8884d8" 
                        strokeWidth={2} 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="dias" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversas por Dia da Semana</CardTitle>
                <CardDescription>Análise semanal de volume de conversas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={conversationsByDay}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar 
                        dataKey="count" 
                        name="Conversas"
                        fill="#4f46e5" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="canais" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Canal</CardTitle>
                <CardDescription>Volume de conversas por canal de comunicação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={channelData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Bar 
                        dataKey="value" 
                        name="Conversas" 
                        fill="#8884d8" 
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* KPIs detalhados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Agentes em Destaque</CardTitle>
              <CardDescription>Agentes com melhor desempenho no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Maria Silva</p>
                    <p className="text-sm text-muted-foreground">65 conversas atendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">4.9/5</p>
                    <p className="text-sm text-muted-foreground">CSAT</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">João Souza</p>
                    <p className="text-sm text-muted-foreground">58 conversas atendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">4.7/5</p>
                    <p className="text-sm text-muted-foreground">CSAT</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Ana Oliveira</p>
                    <p className="text-sm text-muted-foreground">52 conversas atendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">4.6/5</p>
                    <p className="text-sm text-muted-foreground">CSAT</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Assuntos Principais</CardTitle>
              <CardDescription>Tópicos mais discutidos nas conversas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Suporte Técnico</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium">45%</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Informações de Produto</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "30%" }}></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium">30%</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Pagamentos</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "15%" }}></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium">15%</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Reclamações</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "10%" }}></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium">10%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}