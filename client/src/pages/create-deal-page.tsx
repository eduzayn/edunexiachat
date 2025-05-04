import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  User,
  Building2,
} from "lucide-react";

// Interfaces
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

// Componente principal
export default function CreateDealPage() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const contactId = params.contactId;
  
  // Estados do formulário
  const [title, setTitle] = useState("");
  const [value, setValue] = useState<string>(""); 
  const [downPayment, setDownPayment] = useState<string>("");
  const [installments, setInstallments] = useState<string>("1");
  const [installmentValue, setInstallmentValue] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cartao");
  const [stage, setStage] = useState("qualificacao");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  
  
  // Estados da página
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Buscar dados necessários na inicialização
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Buscar contato se contactId estiver presente
        if (contactId) {
          const contactRes = await apiRequest("GET", `/api/contacts/${contactId}`);
          if (contactRes.ok) {
            const contactData = await contactRes.json();
            setContact(contactData);
          }
        }
        
        // Buscar usuários para o select
        const usersRes = await apiRequest("GET", "/api/users");
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados necessários.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [contactId, toast]);
  
  // Função para criar a negociação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast({
        title: "Campo obrigatório",
        description: "O título da negociação é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    if (!contactId) {
      toast({
        title: "Contato não selecionado",
        description: "É necessário selecionar um contato para a negociação.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Limpar os valores antes do envio
      const cleanValue = (val: string) => {
        if (!val) return undefined;
        // Remover caracteres não numéricos, exceto ponto e vírgula
        const cleanedValue = val.replace(/[^\d,.]/g, '');
        // Substituir vírgula por ponto para cálculos
        return parseFloat(cleanedValue.replace(/,/g, '.'));
      };
      
      const dealData = {
        contactId: parseInt(contactId),
        title,
        value: cleanValue(value),
        downPayment: cleanValue(downPayment),
        installments: installments ? parseInt(installments) : 1,
        installmentValue: cleanValue(installmentValue),
        paymentMethod,
        stage,
        status: "open",
        expectedCloseDate: expectedCloseDate || undefined,
        description: description || undefined,
        assignedTo: assignedTo && assignedTo !== "none" ? parseInt(assignedTo) : undefined
      };
      
      const res = await apiRequest("POST", "/api/deals", dealData);
      
      if (res.ok) {
        const createdDeal = await res.json();
        
        toast({
          title: "Negociação criada",
          description: "A negociação foi criada com sucesso.",
          variant: "default",
        });
        
        // Invalidar cache
        queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
        
        // Redirecionar para a página da negociação ou de contato
        if (createdDeal.id) {
          navigate(`/deal/${createdDeal.id}`);
        } else {
          navigate(`/contact/${contactId.toString()}`);
        }
      } else {
        throw new Error("Falha ao criar negociação");
      }
    } catch (error) {
      console.error("Erro ao criar negociação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a negociação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Renderizar esqueleto de carregamento
  if (loading) {
    return (
      <AppShell>
        <div className="container max-w-3xl mx-auto py-6 px-4">
          <div className="flex items-center space-x-2 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-10 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            
            <div className="space-y-4 mt-6">
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }
  
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
          <h1 className="text-3xl font-bold tracking-tight">Nova Negociação</h1>
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
              <CardTitle>Informações da Negociação</CardTitle>
              <CardDescription>
                Preencha os detalhes da nova oportunidade de negócio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título*</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da negociação"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="value">Valor Total (R$)</Label>
                <div className="relative">
                  <Input
                    id="value"
                    type="text"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      
                      // Calcular valor da parcela
                      if (e.target.value && installments && parseInt(installments) > 0) {
                        // Limpar valor para processamento
                        const numValue = e.target.value.replace(/[^\d,.]/g, '').replace(',', '.');
                        if (!isNaN(parseFloat(numValue))) {
                          const total = parseFloat(numValue);
                          
                          // Considerar valor de entrada se existir
                          let remaining = total;
                          if (downPayment) {
                            const dpValue = downPayment.replace(/[^\d,.]/g, '').replace(',', '.');
                            if (!isNaN(parseFloat(dpValue))) {
                              remaining = total - parseFloat(dpValue);
                            }
                          }
                          
                          const inst = parseInt(installments);
                          const instValue = (remaining / inst).toFixed(2).replace('.', ',');
                          setInstallmentValue(instValue);
                        }
                      }
                    }}
                    placeholder="0,00"
                    className="pr-10"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 pointer-events-none">
                    R$
                  </span>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="downPayment">Valor de Entrada (R$)</Label>
                <div className="relative">
                  <Input
                    id="downPayment"
                    type="text"
                    value={downPayment}
                    onChange={(e) => {
                      setDownPayment(e.target.value);
                      
                      // Recalcular valor das parcelas quando o valor de entrada muda
                      if (value && installments && parseInt(installments) > 0) {
                        const numValue = value.replace(/[^\d,.]/g, '').replace(',', '.');
                        const dpValue = e.target.value.replace(/[^\d,.]/g, '').replace(',', '.');
                        
                        if (!isNaN(parseFloat(numValue)) && !isNaN(parseFloat(dpValue))) {
                          const total = parseFloat(numValue);
                          const downPaymentVal = parseFloat(dpValue);
                          const remaining = total - downPaymentVal;
                          
                          if (remaining > 0) {
                            const inst = parseInt(installments);
                            const instValue = (remaining / inst).toFixed(2).replace('.', ',');
                            setInstallmentValue(instValue);
                          } else {
                            setInstallmentValue("0,00");
                          }
                        }
                      }
                    }}
                    placeholder="0,00"
                    className="pr-10"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 pointer-events-none">
                    R$
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="installments">Quantidade de Parcelas</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="1"
                    step="1"
                    value={installments}
                    onChange={(e) => {
                      setInstallments(e.target.value);
                      
                      // Calcular valor da parcela quando muda o número de parcelas
                      if (value && e.target.value && parseInt(e.target.value) > 0) {
                        // Limpar valor para processamento
                        const numValue = value.replace(/[^\d,.]/g, '').replace(',', '.');
                        if (!isNaN(parseFloat(numValue))) {
                          const total = parseFloat(numValue);
                          
                          // Considerar valor de entrada se existir
                          let remaining = total;
                          if (downPayment) {
                            const dpValue = downPayment.replace(/[^\d,.]/g, '').replace(',', '.');
                            if (!isNaN(parseFloat(dpValue))) {
                              remaining = total - parseFloat(dpValue);
                            }
                          }
                          
                          const inst = parseInt(e.target.value);
                          if (remaining > 0) {
                            const instValue = (remaining / inst).toFixed(2).replace('.', ',');
                            setInstallmentValue(instValue);
                          } else {
                            setInstallmentValue("0,00");
                          }
                        }
                      }
                    }}
                    placeholder="1"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="installmentValue">Valor da Parcela (R$)</Label>
                  <div className="relative">
                    <Input
                      id="installmentValue"
                      type="text"
                      value={installmentValue}
                      placeholder="0,00"
                      disabled
                      className="pr-10"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 pointer-events-none">
                      R$
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Meio de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o meio de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="stage">Estágio*</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estágio" />
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
              
              <div className="grid gap-2">
                <Label htmlFor="expectedCloseDate">Data de fechamento prevista</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
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
              
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição detalhada da negociação"
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => window.history.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Negociação"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}