import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, User, Building2, Calendar, Clock } from "lucide-react";

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

export default function CreateActivityPage() {
  const [location, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const contactId = params.contactId;
  const dealId = params.dealId; // Se a atividade for criada a partir de uma negociação
  
  // Estados para o formulário
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("task");
  const [dueDate, setDueDate] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [contact, setContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Buscar dados do contato e usuários para o formulário
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Se tiver contactId, busca os dados do contato
        if (contactId) {
          const contactRes = await apiRequest("GET", `/api/contacts/${contactId}`);
          if (contactRes.ok) {
            setContact(await contactRes.json());
          } else {
            toast({
              title: "Erro",
              description: "Não foi possível carregar os dados do contato.",
              variant: "destructive",
            });
          }
        }
        
        // Buscar lista de usuários para atribuição
        const usersRes = await apiRequest("GET", "/api/users");
        if (usersRes.ok) {
          setUsers(await usersRes.json());
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível carregar a lista de usuários.",
            variant: "destructive",
          });
        }
        
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao carregar os dados necessários.",
          variant: "destructive",
        });
      }
    };
    
    fetchData();
  }, [contactId, toast]);
  
  // Função para formatar a data para o formato esperado pelo backend
  const formatDateForServer = (dateString: string): string => {
    if (!dateString) return "";
    // Converter para objeto Date e depois para ISO string truncada (sem timezone)
    return new Date(dateString).toISOString().slice(0, 19).replace('T', ' ');
  };
  
  // Handler de envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      toast({
        title: "Erro de validação",
        description: "O assunto da atividade é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Dados para enviar à API
      const activityData = {
        contactId: contactId ? parseInt(contactId) : undefined,
        dealId: dealId ? parseInt(dealId) : undefined,
        type,
        subject,
        description: description.trim() || undefined,
        dueDate: dueDate ? formatDateForServer(dueDate) : undefined,
        status: "pending",
        userId: assignedTo !== "none" ? parseInt(assignedTo) : undefined,
      };
      
      const response = await apiRequest("POST", "/api/activities", activityData);
      
      if (response.ok) {
        toast({
          title: "Atividade criada",
          description: "A atividade foi criada com sucesso.",
        });
        
        // Invalidar cache de atividades
        if (contactId) {
          queryClient.invalidateQueries({ queryKey: [`/api/activities?contactId=${contactId}`] });
        }
        if (dealId) {
          queryClient.invalidateQueries({ queryKey: [`/api/activities?dealId=${dealId}`] });
        }
        
        // Redirecionar de volta para o contato ou negociação
        if (contactId) {
          navigate(`/contact/${contactId}`);
        } else if (dealId) {
          navigate(`/deal/${dealId}`);
        } else {
          navigate("/crm");
        }
      } else {
        throw new Error("Falha ao criar atividade");
      }
    } catch (error) {
      console.error("Erro ao criar atividade:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a atividade. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AppShell>
      <div className="container max-w-3xl mx-auto py-6 px-4">
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
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Nova Atividade</h1>
          {contact && (
            <div className="flex items-center mt-2">
              <span className="text-muted-foreground flex items-center">
                <User className="h-4 w-4 mr-1" />
                {contact.name}
                {contact.company && (
                  <>
                    <span className="mx-2">•</span>
                    <Building2 className="h-4 w-4 mr-1" />
                    {contact.company}
                  </>
                )}
              </span>
            </div>
          )}
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Informações da Atividade</CardTitle>
              <CardDescription>
                Preencha os detalhes da nova atividade relacionada ao contato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Assunto*</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Título da atividade"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Atividade*</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre a atividade"
                  rows={4}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="assignedTo">Responsável</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} {(user as any).role ? `(${(user as any).role === 'admin' ? 'Admin' : (user as any).role === 'seller' ? 'Vendedor' : 'Agente'})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => window.history.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Atividade"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}