import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Message } from "@shared/schema";
import { Lightbulb, Loader2 } from "lucide-react";

interface ResponseSuggestionsProps {
  messageId: number;
  conversationId: number;
  onSelectSuggestion: (suggestion: string) => void;
}

export function ResponseSuggestions({ 
  messageId, 
  conversationId, 
  onSelectSuggestion 
}: ResponseSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Consulta as sugestões de resposta da API somente quando expandido
  const { 
    data, 
    isLoading, 
    isError, 
    refetch, 
    isRefetching 
  } = useQuery<{
    suggestions: string[]
  }>({
    queryKey: [`/api/conversations/${conversationId}/suggestions`, messageId],
    enabled: false, // Não consultar automaticamente
  });
  
  // Expandir o painel de sugestões e fazer a consulta
  const handleExpand = async () => {
    setIsExpanded(true);
    
    // Realizar a consulta manualmente
    try {
      const response = await apiRequest(`/api/conversations/${conversationId}/suggestions`, {
        method: "POST",
        data: {
          messageId,
          maxSuggestions: 3
        }
      });
      
      // Atualizar os dados diretamente
      refetch();
    } catch (error) {
      console.error("Erro ao obter sugestões:", error);
    }
  };
  
  // Selecionar uma sugestão
  const handleSelectSuggestion = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setIsExpanded(false);
  };
  
  // Fechar o painel quando o usuário clica fora
  useEffect(() => {
    const handleClickOutside = () => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    };
    
    // Adicionar evento com delay para evitar que o mesmo clique que abre feche imediatamente
    let timeoutId: NodeJS.Timeout;
    if (isExpanded) {
      timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 100);
    }
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isExpanded]);
  
  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center text-xs text-gray-500 hover:bg-gray-100 py-1 px-2 h-auto"
        onClick={(e) => {
          e.stopPropagation(); // Evitar que o clique propague para o documento
          handleExpand();
        }}
      >
        <Lightbulb className="h-3 w-3 mr-1" />
        <span>Sugestões</span>
      </Button>
    );
  }
  
  return (
    <div className="absolute bottom-full left-0 right-0 bg-white shadow-lg rounded-lg p-2 mb-2 z-10 border border-gray-200">
      <div className="text-xs font-medium text-gray-500 mb-2 flex items-center justify-between">
        <span>Sugestões de resposta</span>
        {(isLoading || isRefetching) && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
      </div>
      
      {isError && (
        <div className="text-xs text-red-500 p-2 bg-red-50 rounded">
          Não foi possível obter sugestões neste momento.
        </div>
      )}
      
      {!isLoading && !isError && data?.suggestions && (
        <div className="space-y-1">
          {data.suggestions.length === 0 ? (
            <div className="text-xs text-gray-500 p-2">
              Nenhuma sugestão disponível para esta mensagem.
            </div>
          ) : (
            data.suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs p-2 h-auto text-left whitespace-normal hover:bg-gray-100"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion}
              </Button>
            ))
          )}
        </div>
      )}
      
      {(isLoading || isRefetching) && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
}