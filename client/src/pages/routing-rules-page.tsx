import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  PlusCircle, 
  Check,
  User,
  MessageSquare,
  Filter
} from 'lucide-react';
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
import { Switch } from "@/components/ui/switch";

// Definição do tipo de uma regra de roteamento
interface RoutingRule {
  id?: number;
  name: string;
  description: string;
  isActive: boolean;
  condition: string;
  conditionValue: string;
  assignTo: string;
  priority: string;
  createdAt?: string;
  updatedAt?: string;
}

// Definição do tipo de um usuário
interface User {
  id: number;
  name: string;
  username: string;
  role?: string;
  email?: string;
}

export default function RoutingRulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    isActive: true,
    condition: 'keyword',
    conditionValue: '',
    assignTo: '',
    priority: '5'
  });
  
  // Consulta para obter as regras de roteamento
  const {
    data: rules = [] as RoutingRule[],
    isLoading: isLoadingRules,
    isError: isErrorRules,
    error: rulesError,
  } = useQuery<RoutingRule[], Error>({
    queryKey: ["/api/routing/rules"],
    queryFn: async () => {
      const response = await fetch("/api/routing/rules");
      if (!response.ok) {
        throw new Error("Erro ao carregar regras de roteamento");
      }
      return response.json();
    },
  });
  
  // Consulta para obter usuários (atendentes)
  const {
    data: users = [
      { id: 1, name: "Administrador", username: "admin", role: "admin" },
      { id: 2, name: "João Silva", username: "joao", role: "agent" },
      { id: 3, name: "Maria Oliveira", username: "maria", role: "agent" },
      { id: 4, name: "Carlos Santos", username: "carlos", role: "agent" }
    ] as User[],
    isLoading: isLoadingUsers,
  } = useQuery<User[], Error>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }
      return response.json();
    },
  });
  
  // Mutation para criar uma nova regra
  const createRuleMutation = useMutation<RoutingRule, Error, RoutingRule>({
    mutationFn: async (newRuleData: RoutingRule) => {
      const response = await fetch("/api/routing/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRuleData),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao criar regra de roteamento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Regra criada com sucesso",
        description: "A regra de roteamento foi adicionada ao sistema.",
        // @ts-ignore
        variant: "success",
      });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/routing/rules"] });
      // Resetar o formulário
      setNewRule({
        name: '',
        description: '',
        isActive: true,
        condition: 'keyword',
        conditionValue: '',
        assignTo: '',
        priority: '5'
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar regra",
        description: error.message || "Ocorreu um erro ao criar a regra de roteamento.",
        variant: "destructive",
      });
    },
  });
  
  // Manipulador para alterações no formulário
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewRule(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipulador para alterações em selects
  const handleSelectChange = (name: string, value: string) => {
    setNewRule(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipulador para alterações em switches
  const handleSwitchChange = (name: string, checked: boolean) => {
    setNewRule(prev => ({ ...prev, [name]: checked }));
  };
  
  // Manipulador para envio do formulário
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createRuleMutation.mutate(newRule as RoutingRule);
  };

  // Estado de erro
  if (isErrorRules) {
    return (
      <AppShell title="Regras de Roteamento - Erro">
        <div className="w-full py-6 px-4 md:px-6 space-y-6">
          <PageHeader
            title="Regras de Roteamento"
            description="Configure regras para atribuir conversas automaticamente."
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-red-500">Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-red-500 mb-4">
                <AlertTriangle className="mr-2" />
                <p>Ocorreu um erro ao carregar as regras de roteamento.</p>
              </div>
              <p>{rulesError instanceof Error ? rulesError.message : 'Erro desconhecido'}</p>
              <Button 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/routing/rules"] })}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Estado de carregamento
  if (isLoadingRules) {
    return (
      <AppShell title="Regras de Roteamento">
        <div className="w-full py-6 px-4 md:px-6 space-y-6">
          <PageHeader
            title="Regras de Roteamento"
            description="Configure regras para atribuir conversas automaticamente."
          />
          <Card>
            <CardHeader>
              <CardTitle>Carregando regras...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Renderização normal
  return (
    <AppShell title="Regras de Roteamento">
      <div className="w-full py-6 px-4 md:px-6 space-y-6">
        <PageHeader
          title="Regras de Roteamento"
          description="Configure regras para atribuir conversas automaticamente."
          actions={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Criar Nova Regra de Roteamento</DialogTitle>
                  <DialogDescription>
                    Configure uma regra para direcionar conversas automaticamente para atendentes específicos.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Nome
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={newRule.name}
                        onChange={handleInputChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Descrição
                      </Label>
                      <Input
                        id="description"
                        name="description"
                        value={newRule.description}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="condition" className="text-right">
                        Condição
                      </Label>
                      <Select
                        name="condition"
                        value={newRule.condition}
                        onValueChange={(value) => handleSelectChange("condition", value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o tipo de condição" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keyword">Palavra-chave</SelectItem>
                          <SelectItem value="channel">Canal</SelectItem>
                          <SelectItem value="time">Horário</SelectItem>
                          <SelectItem value="language">Idioma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="conditionValue" className="text-right">
                        Valor
                      </Label>
                      <Input
                        id="conditionValue"
                        name="conditionValue"
                        value={newRule.conditionValue}
                        onChange={handleInputChange}
                        className="col-span-3"
                        required
                        placeholder={
                          newRule.condition === 'keyword' ? 'Ex: suporte, ajuda, problema' :
                          newRule.condition === 'channel' ? 'Ex: whatsapp, facebook, web' :
                          newRule.condition === 'time' ? 'Ex: 08:00-18:00' :
                          'Ex: pt-BR, en-US'
                        }
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="assignTo" className="text-right">
                        Atribuir para
                      </Label>
                      <Select
                        name="assignTo"
                        value={newRule.assignTo}
                        onValueChange={(value) => handleSelectChange("assignTo", value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione um atendente" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingUsers ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            users.map((user: User) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="priority" className="text-right">
                        Prioridade
                      </Label>
                      <Select
                        name="priority"
                        value={newRule.priority}
                        onValueChange={(value) => handleSelectChange("priority", value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Muito baixa</SelectItem>
                          <SelectItem value="3">3 - Baixa</SelectItem>
                          <SelectItem value="5">5 - Média</SelectItem>
                          <SelectItem value="7">7 - Alta</SelectItem>
                          <SelectItem value="10">10 - Muito alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="isActive" className="text-right">
                        Ativa
                      </Label>
                      <div className="flex items-center col-span-3">
                        <Switch
                          id="isActive"
                          checked={newRule.isActive}
                          onCheckedChange={(checked) => handleSwitchChange("isActive", checked)}
                        />
                        <Label htmlFor="isActive" className="ml-2">
                          {newRule.isActive ? 'Sim' : 'Não'}
                        </Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createRuleMutation.isPending} 
                      className="mr-2"
                    >
                      {createRuleMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Regras de Roteamento</CardTitle>
            <CardDescription>
              Configure regras para atribuir conversas automaticamente a atendentes com base em condições.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Implementação do conteúdo de regras de roteamento será adicionada em breve.</p>
            <p className="mt-2">Total de regras: {rules.length}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}