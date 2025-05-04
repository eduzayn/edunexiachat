import { useState, useEffect } from 'react';
import { GitBranch, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EnvironmentBannerProps {
  environmentName: string;
  environmentType: 'homolog' | 'dev' | 'production';
  showCloseButton?: boolean;
}

export function EnvironmentBanner({ 
  environmentName, 
  environmentType, 
  showCloseButton = true 
}: EnvironmentBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Log para debugging
  useEffect(() => {
    console.log(`EnvironmentBanner renderizado - Nome: ${environmentName}, Tipo: ${environmentType}`);
  }, [environmentName, environmentType]);
  
  // Definir cores com base no tipo de ambiente
  const getColorsByType = () => {
    switch (environmentType) {
      case 'homolog':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-900',
          border: 'border-yellow-600',
          badge: 'bg-yellow-700 text-yellow-100'
        };
      case 'dev':
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-900',
          border: 'border-blue-600',
          badge: 'bg-blue-700 text-blue-100'
        };
      case 'production':
        return {
          bg: 'bg-green-500',
          text: 'text-green-900',
          border: 'border-green-600',
          badge: 'bg-green-700 text-green-100'
        };
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-900',
          border: 'border-gray-600',
          badge: 'bg-gray-700 text-gray-100'
        };
    }
  };
  
  const colors = getColorsByType();
  
  if (!isVisible) return null;
  
  return (
    <div className={`w-full ${colors.bg} ${colors.text} py-1 flex items-center justify-center border-b ${colors.border} z-50`}>
      <div className="flex items-center space-x-2">
        <GitBranch className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Ambiente:</span>
        <Badge variant="outline" className={`text-xs font-semibold ${colors.badge} border-0`}>
          {environmentName}
        </Badge>
      </div>
      
      {showCloseButton && (
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}