import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Contact } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { formatPhoneNumber } from "@/lib/utils";
import { PlusCircle, Search, Phone, Mail, Building, User, Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form schema for creating/editing contacts
const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal("")),
  identifier: z.string().min(1, { message: "Identificador é obrigatório" }),
  source: z.string().min(1, { message: "Origem é obrigatória" }),
  company: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function ContactsPage() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const { toast } = useToast();
  
  // Set up form
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      identifier: "",
      source: "manual",
      company: "",
      position: "",
      notes: "",
    },
  });

  // Fetch contacts
  const { data: contacts, isLoading, refetch } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/contacts", {
          credentials: "include"
        });
        
        if (!response.ok) {
          console.error("Erro ao buscar contatos:", response.status);
          return [];
        }
        
        try {
          const data = await response.json();
          console.log("Dados de contatos carregados:", data);
          return Array.isArray(data) ? data : [];
        } catch (jsonError) {
          console.error("Erro ao processar JSON dos contatos:", jsonError);
          return [];
        }
      } catch (error) {
        console.error("Erro na requisição de contatos:", error);
        return [];
      }
    },
    staleTime: 0, // Sempre considera os dados como desatualizados
    refetchOnMount: true, // Sempre refaz a busca quando o componente é montado
  });
  
  // Reset form when editing contact changes
  useEffect(() => {
    if (editingContact) {
      form.reset({
        name: editingContact.name,
        phone: editingContact.phone || "",
        email: editingContact.email || "",
        identifier: editingContact.identifier,
        source: editingContact.source,
        company: editingContact.company || "",
        position: editingContact.position || "",
        notes: editingContact.notes || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        identifier: "",
        source: "manual",
        company: "",
        position: "",
        notes: "",
      });
    }
  }, [editingContact, form]);
  
  // Filter contacts based on search query
  const filteredContacts = contacts?.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchQuery)) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Handle form submission for creating/editing contacts
  const onSubmit = async (data: ContactFormData) => {
    try {
      console.log("Submitting form data:", data);
      const payload = editingContact ? { id: editingContact.id, ...data } : data;
      
      // Usando apiRequest com importação correta do lib/queryClient
      const response = await apiRequest("/api/contacts", { 
        method: "POST", 
        data: payload 
      });
      
      console.log("API response:", response);
      toast({
        title: editingContact ? "Contato atualizado" : "Contato criado",
        description: editingContact 
          ? "O contato foi atualizado com sucesso." 
          : "O contato foi criado com sucesso.",
      });
      
      refetch();
      setIsFormOpen(false);
      setEditingContact(null);
    } catch (error) {
      console.error("Error saving contact:", error);
      // Verificar erros de validação
      if (form.formState.errors) {
        console.log("Form validation errors:", form.formState.errors);
      }
      
      toast({
        title: "Erro ao salvar contato",
        description: "Ocorreu um erro ao salvar o contato. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Open form for editing a contact
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };
  
  // Open form for creating a new contact
  const handleAddContact = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };
  
  // Function to handle contact deletion
  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    
    try {
      // Usando a sintaxe correta do apiRequest
      await apiRequest(`/api/contacts/${contactToDelete.id}`, {
        method: "DELETE"
      });
      
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
      refetch();
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Erro ao excluir contato",
        description: "Ocorreu um erro ao tentar excluir o contato.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <AppShell title="Contatos">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        <PageHeader
          title="Contatos"
          description="Gerenciamento de contatos e leads"
          breadcrumbs={[{ label: "Contatos" }]}
          actions={
            <Button onClick={handleAddContact} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          }
          className="py-4 px-6 bg-white border-b border-gray-200"
        />
        
        <div className="px-6 pt-4 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Buscar contatos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredContacts?.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum contato encontrado</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "Tente ajustar sua busca ou adicione um novo contato."
                  : "Comece adicionando seu primeiro contato."}
              </p>
              <Button onClick={handleAddContact}>Adicionar Contato</Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Empresa</TableHead>
                    <TableHead className="hidden md:table-cell">Cargo</TableHead>
                    <TableHead className="hidden md:table-cell">Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts?.map((contact) => (
                    <TableRow 
                      key={contact.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleEditContact(contact)}
                    >
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>
                        {contact.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {formatPhoneNumber(contact.phone)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {contact.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {contact.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {contact.company && (
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-gray-400" />
                            {contact.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{contact.position}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="capitalize">
                          {contact.source.replace("_", " ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditContact(contact);
                            }}
                          >
                            <span className="sr-only">Editar</span>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContactToDelete(contact);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <span className="sr-only">Excluir</span>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      
      {/* Contact Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Editar Contato" : "Novo Contato"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(99) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Cargo na empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Observações sobre o contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificador</FormLabel>
                    <FormControl>
                      <Input placeholder="Identificador no canal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <FormControl>
                      <Input placeholder="Origem do contato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o contato {contactToDelete?.name}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteContact}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}