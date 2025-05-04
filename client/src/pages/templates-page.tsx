import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCopy, Edit, Plus, Search, Trash, Eye } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Definição do esquema para validação do formulário
const templateFormSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }).max(100),
  category: z.string().min(1, { message: "Categoria é obrigatória" }),
  content: z.string().min(1, { message: "Conteúdo é obrigatório" }),
  description: z.string().optional(),
  tags: z.string().optional()
});

// Interface do template
interface Template {
  id: number;
  name: string;
  category: string;
  content: string;
  description: string | null;
  tags: string[] | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
}

// Componente principal
export default function TemplatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState<boolean>(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState<string>("");
  
  // Buscar todos os templates
  const { data: templates, isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    enabled: !!user
  });
  
  // Formulário para criar template
  const createForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      category: "general",
      content: "",
      description: "",
      tags: ""
    },
  });
  
  // Formulário para editar template
  const editForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      category: "general",
      content: "",
      description: "",
      tags: ""
    },
  });
  
  // Mutation para criar um novo template
  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof templateFormSchema>) => {
      // Converter string de tags para array
      const processedTags = values.tags ? values.tags.split(",").map(tag => tag.trim()) : [];
      
      const payload = {
        ...values,
        tags: processedTags.length > 0 ? processedTags : null,
        description: values.description || null
      };
      
      const res = await apiRequest("POST", "/api/templates", payload);
      return await res.json();
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para atualizar um template
  const updateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof templateFormSchema> & { id: number }) => {
      const { id, ...rest } = values;
      
      // Converter string de tags para array
      const processedTags = rest.tags ? rest.tags.split(",").map(tag => tag.trim()) : [];
      
      const payload = {
        ...rest,
        tags: processedTags.length > 0 ? processedTags : null,
        description: rest.description || null
      };
      
      const res = await apiRequest("PUT", `/api/templates/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir um template
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation para aplicar um template (pré-visualização)
  const applyMutation = useMutation({
    mutationFn: async ({ id, variables }: { id: number; variables: Record<string, string> }) => {
      const res = await apiRequest("POST", `/api/templates/${id}/apply`, { variables });
      return await res.json();
    },
    onSuccess: (data) => {
      setPreviewContent(data.processedContent);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Abrir o dialog de edição e preencher o formulário
  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    
    editForm.reset({
      name: template.name,
      category: template.category,
      content: template.content,
      description: template.description || "",
      tags: template.tags ? template.tags.join(", ") : "",
    });
    
    setIsEditDialogOpen(true);
  };
  
  // Abrir o dialog de pré-visualização
  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewContent(template.content);
    
    // Extrair variáveis do conteúdo do template - padrão {variavel}
    const variableMatches = template.content.match(/\{([^}]+)\}/g) || [];
    const variableNames = variableMatches.map(v => v.replace(/[{}]/g, ""));
    
    // Inicializar objeto de variáveis com valores vazios
    const initialVariables: Record<string, string> = {};
    variableNames.forEach(v => {
      initialVariables[v] = "";
    });
    
    setPreviewVariables(initialVariables);
    setIsPreviewDialogOpen(true);
  };
  
  // Copiar o conteúdo para a área de transferência
  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        toast({
          title: "Conteúdo copiado",
          description: "O conteúdo foi copiado para a área de transferência.",
        });
      })
      .catch(err => {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o conteúdo.",
          variant: "destructive",
        });
      });
  };
  
  // Função para atualizar o valor de uma variável na pré-visualização
  const updateVariable = (name: string, value: string) => {
    setPreviewVariables(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Efeito para processar o template quando as variáveis mudam
  useEffect(() => {
    if (selectedTemplate && isPreviewDialogOpen) {
      applyMutation.mutate({
        id: selectedTemplate.id,
        variables: previewVariables
      });
    }
  }, [previewVariables, isPreviewDialogOpen]);
  
  // Filtrar templates com base na categoria e termo de busca selecionados
  const filteredTemplates = templates
    ? templates.filter(template => {
        const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
        const matchesSearch = !searchTerm || 
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
        
        return matchesCategory && matchesSearch;
      })
    : [];
  
  // Obter categorias exclusivas
  const uniqueCategories = templates
    ? Array.from(new Set(templates.map(t => t.category)))
    : [];
  
  // Enviar formulário de criação
  const onCreateSubmit = (values: z.infer<typeof templateFormSchema>) => {
    createMutation.mutate(values);
  };
  
  // Enviar formulário de edição
  const onEditSubmit = (values: z.infer<typeof templateFormSchema>) => {
    if (selectedTemplate) {
      updateMutation.mutate({
        ...values,
        id: selectedTemplate.id
      });
    }
  };
  
  // Redirecionamento se não estiver autenticado
  if (!authLoading && !user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <AppShell>
      <div className="container py-6">
        <PageHeader
          title="Templates de Mensagem"
          description="Gerenciamento de templates para envio de mensagens"
          actions={
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          }
        />
        
        <div className="flex flex-col gap-6">
          {/* Busca e filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Lista de templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templatesLoading ? (
              <p>Carregando templates...</p>
            ) : filteredTemplates.length === 0 ? (
              <p>Nenhum template encontrado.</p>
            ) : (
              filteredTemplates.map(template => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <CardDescription>
                      {template.description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="relative h-[100px] overflow-hidden mb-2">
                      <div className="absolute inset-0 overflow-hidden">
                        <p className="text-sm text-muted-foreground">
                          {template.content}
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
                    </div>
                    
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Usado {template.usageCount || 0} vezes
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyContent(template.content)}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o template "{template.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(template.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
        
        {/* Dialog para criar um novo template */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Template</DialogTitle>
              <DialogDescription>
                Preencha as informações para criar um novo template de mensagem.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do template" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">Geral</SelectItem>
                          <SelectItem value="greeting">Saudação</SelectItem>
                          <SelectItem value="support">Suporte</SelectItem>
                          <SelectItem value="sales">Vendas</SelectItem>
                          <SelectItem value="followup">Acompanhamento</SelectItem>
                          <SelectItem value="closing">Encerramento</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Descrição do template (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Conteúdo do template. Use {nome_variavel} para variáveis substituíveis."
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use chaves para definir variáveis. Ex: Olá {"{nome}"}, como vai?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="Tags separadas por vírgula (opcional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Exemplo: saudação, boas-vindas, formal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={createMutation.isPending}
                  >
                    Criar Template
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Dialog para editar um template */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Template</DialogTitle>
              <DialogDescription>
                Altere as informações do template.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do template" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">Geral</SelectItem>
                          <SelectItem value="greeting">Saudação</SelectItem>
                          <SelectItem value="support">Suporte</SelectItem>
                          <SelectItem value="sales">Vendas</SelectItem>
                          <SelectItem value="followup">Acompanhamento</SelectItem>
                          <SelectItem value="closing">Encerramento</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Descrição do template (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Conteúdo do template. Use {nome_variavel} para variáveis substituíveis."
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use chaves para definir variáveis. Ex: Olá {"{nome}"}, como vai?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="Tags separadas por vírgula (opcional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Exemplo: saudação, boas-vindas, formal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={updateMutation.isPending}
                  >
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Dialog para pré-visualizar e testar um template */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? selectedTemplate.name : "Pré-visualização"}
              </DialogTitle>
              <DialogDescription>
                Visualize e teste o template com diferentes variáveis.
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
                  <TabsTrigger value="variables">Variáveis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="space-y-4">
                  <div className="border rounded-md p-4 min-h-[150px] whitespace-pre-wrap">
                    {previewContent}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleCopyContent(previewContent)}
                    >
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="variables" className="space-y-4">
                  {Object.keys(previewVariables).length === 0 ? (
                    <p className="text-muted-foreground">
                      Este template não contém variáveis.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(previewVariables).map(([name, value]) => (
                        <div key={name} className="grid grid-cols-3 gap-4 items-center">
                          <div>
                            <label className="text-sm font-medium">{name}</label>
                          </div>
                          <div className="col-span-2">
                            <Input
                              value={value}
                              onChange={(e) => updateVariable(name, e.target.value)}
                              placeholder={`Valor para ${name}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPreviewDialogOpen(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}