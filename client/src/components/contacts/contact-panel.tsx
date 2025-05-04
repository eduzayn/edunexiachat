import { useQuery } from "@tanstack/react-query";
import { Contact, Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, DollarSign, Calendar, Building, Mail, Phone, User, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactPanelProps {
  conversationId: number;
  onClose: () => void;
}

export function ContactPanel({ conversationId, onClose }: ContactPanelProps) {
  // Fetch conversation data
  const { data: conversationData } = useQuery<{
    conversation: Conversation;
    messages: any[];
  }>({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: !!conversationId,
  });
  
  // Fetch contact data
  const { data: contact } = useQuery<Contact>({
    queryKey: [
      `/api/contacts/${conversationData?.conversation.contactId}`
    ],
    enabled: !!conversationData?.conversation.contactId,
  });
  
  if (!conversationData || !contact) {
    return (
      <div className="hidden lg:flex flex-col w-80 border-l border-gray-200 bg-white p-6 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  const { conversation, messages } = conversationData;
  const firstConversationDate = format(
    new Date(conversation.createdAt), 
    "dd/MM/yyyy", 
    { locale: ptBR }
  );
  
  // Determine channel type
  const channelType = "WhatsApp"; // This would come from the channel info
  
  const handleRequestPayment = () => {
    // Logic to request payment would go here
    console.log("Request payment for contact:", contact.id);
  };
  
  const handleScheduleMeeting = () => {
    // Logic to schedule meeting would go here
    console.log("Schedule meeting with contact:", contact.id);
  };
  
  return (
    <div className="hidden lg:flex flex-col w-80 border-l border-gray-200 bg-white">
      <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Detalhes do contato</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4">
        {/* Contact Profile */}
        <div className="text-center mb-6">
          {contact.name ? (
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random&color=fff&size=96`} 
              className="h-24 w-24 rounded-full mx-auto" 
              alt={contact.name} 
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium text-lg mx-auto">
              {contact.identifier.substring(0, 2).toUpperCase()}
            </div>
          )}
          <h3 className="mt-2 text-lg font-medium text-gray-900">{contact.name || contact.identifier}</h3>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <i className="ri-whatsapp-line mr-1"></i>
            <span>via {channelType}</span>
          </div>
        </div>
        
        {/* Contact Information */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Informações de contato</h4>
          
          <div className="space-y-3">
            {contact.phone && (
              <div className="flex items-start">
                <Phone className="text-gray-400 h-5 w-5 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.phone}</p>
                  <p className="text-xs text-gray-500">Celular</p>
                </div>
              </div>
            )}
            
            {contact.email && (
              <div className="flex items-start">
                <Mail className="text-gray-400 h-5 w-5 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.email}</p>
                  <p className="text-xs text-gray-500">Email</p>
                </div>
              </div>
            )}
            
            {contact.company && (
              <div className="flex items-start">
                <Building className="text-gray-400 h-5 w-5 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.company}</p>
                  <p className="text-xs text-gray-500">Empresa</p>
                </div>
              </div>
            )}
            
            {contact.position && (
              <div className="flex items-start">
                <Star className="text-gray-400 h-5 w-5 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{contact.position}</p>
                  <p className="text-xs text-gray-500">Cargo</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Tags & Labels */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase">Etiquetas</h4>
            <button className="text-xs text-primary-500 hover:text-primary-600">+ Adicionar</button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Lead Qualificado
            </Badge>
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
              Educação Básica
            </Badge>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              Escola Pública
            </Badge>
          </div>
        </div>
        
        {/* Conversation Details */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Detalhes da conversa</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Primeira conversa</p>
              <p className="text-sm font-medium text-gray-900">{firstConversationDate}</p>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Total de mensagens</p>
              <p className="text-sm font-medium text-gray-900">{messages.length}</p>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Canal preferido</p>
              <p className="text-sm font-medium text-gray-900">{channelType}</p>
            </div>
          </div>
        </div>
        
        {/* Custom Fields */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase">Campos personalizados</h4>
            <button className="text-xs text-primary-500 hover:text-primary-600">+ Adicionar</button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Tamanho da escola</p>
              <p className="text-sm font-medium text-gray-900">200 alunos</p>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Orçamento</p>
              <p className="text-sm font-medium text-gray-900">R$ 500 - 1.000/mês</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className="w-full flex items-center justify-center"
            onClick={handleRequestPayment}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Solicitar pagamento
          </Button>
          
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleScheduleMeeting}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Agendar reunião
          </Button>
        </div>
      </div>
    </div>
  );
}
