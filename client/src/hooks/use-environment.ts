import { useState } from 'react';

type EnvironmentType = 'production' | 'homolog' | 'dev';

interface EnvironmentInfo {
  type: EnvironmentType;
  name: string;
  isHomolog: boolean;
  isDev: boolean;
  isProduction: boolean;
}

// Hook simplificado que sempre retorna ambiente de produção
export function useEnvironment(): EnvironmentInfo {
  // Criamos um state para manter a interface compatível,
  // mas sempre retornamos o ambiente de produção
  const [environment] = useState<EnvironmentInfo>({
    type: 'production',
    name: 'Produção',
    isHomolog: false,
    isDev: false,
    isProduction: true
  });

  return environment;
}