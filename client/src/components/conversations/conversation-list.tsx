import { useState } from "react";
import { Conversation } from "@shared/schema";
import { Loader2, Search } from "lucide-react";
import { ConversationItem } from "./conversation-item";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  className?: string;
}

export function ConversationList({
  conversations,
  loading,
  activeConversationId,
  onSelectConversation,
  className = ""
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter conversations based on search query and tab
  const filteredConversations = conversations.filter(conversation => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Here we would ideally search through contact name, but we're using the identifier for now
      return conversation.contactIdentifier.toLowerCase().includes(query);
    }
    
    // Tab filter
    if (activeTab === "unassigned") {
      return !conversation.assignedTo;
    } else if (activeTab === "assigned") {
      return !!conversation.assignedTo;
    }
    
    return true;
  });
  
  return (
    <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-white ${className}`}>
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">Conversas</h1>
        </div>
        
        {/* Mobile menu button - only shown on small screens */}
        <button className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </header>
      
      {/* Search and Filters */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Input
            type="text"
            placeholder="Pesquisar conversas..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        
        {/* Filter tabs */}
        <Tabs
          defaultValue="all"
          className="w-full mt-3"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unassigned">Não atribuídas</TabsTrigger>
            <TabsTrigger value="assigned">Minhas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <p className="text-gray-500">Nenhuma conversa encontrada</p>
            {searchQuery && (
              <button 
                className="mt-2 text-primary-500 hover:underline"
                onClick={() => setSearchQuery("")}
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => onSelectConversation(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
