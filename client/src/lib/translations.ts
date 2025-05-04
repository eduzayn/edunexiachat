// Sistema de tradução simples para garantir consistência nos textos da interface

// Configuração de idioma padrão
export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES';

// Objeto com todas as traduções
const translations: Record<SupportedLanguage, Record<string, string>> = {
  'pt-BR': {
    // Menu principal
    'Dashboard': 'Dashboard',
    'Inbox': 'Caixa de Entrada',
    'Conversations': 'Conversas',
    'Contacts': 'Contatos',
    'CRM': 'CRM',
    'Automations': 'Automações',
    'Templates': 'Templates',
    'Routing Rules': 'Regras de Roteamento',
    'Metrics': 'Métricas',
    'Analytics': 'Análises',
    'Users': 'Usuários',
    'Webhooks': 'Webhooks',
    'Settings': 'Configurações',
    'Cache Admin': 'Admin. Cache',
    'Backups': 'Backups',
    
    // Categorias do menu
    'Main': 'Principal',
    'Management': 'Gerenciamento',
    'Reports': 'Relatórios',
    'System': 'Sistema',
    
    // Outros elementos comuns da interface
    'Save': 'Salvar',
    'Cancel': 'Cancelar',
    'Delete': 'Excluir',
    'Edit': 'Editar',
    'Add': 'Adicionar',
    'Search': 'Buscar',
    'Filter': 'Filtrar',
    'Online': 'Online',
    'Offline': 'Offline',
    'Away': 'Ausente',
  },
  
  'en-US': {
    // Menu principal (padrão em inglês - apenas para garantir consistência)
    'Dashboard': 'Dashboard',
    'Inbox': 'Inbox',
    'Conversations': 'Conversations',
    'Contacts': 'Contacts',
    'CRM': 'CRM',
    'Automations': 'Automations',
    'Templates': 'Templates',
    'Routing Rules': 'Routing Rules',
    'Metrics': 'Metrics',
    'Analytics': 'Analytics',
    'Users': 'Users',
    'Webhooks': 'Webhooks',
    'Settings': 'Settings',
    'Cache Admin': 'Cache Admin',
    'Backups': 'Backups',
    
    // Categorias do menu
    'Main': 'Main',
    'Management': 'Management',
    'Reports': 'Reports',
    'System': 'System',
    
    // Outros elementos comuns da interface
    'Save': 'Save',
    'Cancel': 'Cancel',
    'Delete': 'Delete',
    'Edit': 'Edit',
    'Add': 'Add',
    'Search': 'Search',
    'Filter': 'Filter',
    'Online': 'Online',
    'Offline': 'Offline',
    'Away': 'Away',
  },
  
  'es-ES': {
    // Menu principal
    'Dashboard': 'Dashboard',
    'Inbox': 'Bandeja de Entrada',
    'Conversations': 'Conversaciones',
    'Contacts': 'Contactos',
    'CRM': 'CRM',
    'Automations': 'Automatizaciones',
    'Templates': 'Plantillas',
    'Routing Rules': 'Reglas de Enrutamiento',
    'Metrics': 'Métricas',
    'Analytics': 'Análisis',
    'Users': 'Usuarios',
    'Webhooks': 'Webhooks',
    'Settings': 'Configuración',
    'Cache Admin': 'Admin. Caché',
    'Backups': 'Copias de Seguridad',
    
    // Categorias do menu
    'Main': 'Principal',
    'Management': 'Gestión',
    'Reports': 'Informes',
    'System': 'Sistema',
    
    // Outros elementos comuns da interface
    'Save': 'Guardar',
    'Cancel': 'Cancelar',
    'Delete': 'Eliminar',
    'Edit': 'Editar',
    'Add': 'Añadir',
    'Search': 'Buscar',
    'Filter': 'Filtrar',
    'Online': 'En línea',
    'Offline': 'Desconectado',
    'Away': 'Ausente',
  }
};

// Idioma padrão
let currentLanguage: SupportedLanguage = 'pt-BR';

// Função para obter uma tradução
export function t(key: string): string {
  // Verifica se temos a tradução para o idioma atual
  if (translations[currentLanguage] && translations[currentLanguage][key]) {
    return translations[currentLanguage][key];
  }
  
  // Fallback para idioma padrão se não encontrar
  if (translations['pt-BR'] && translations['pt-BR'][key]) {
    return translations['pt-BR'][key];
  }
  
  // Se não encontrar tradução, retorna a própria chave
  return key;
}

// Função para definir o idioma
export function setLanguage(language: SupportedLanguage): void {
  currentLanguage = language;
  // Salva a preferência do usuário
  try {
    localStorage.setItem('language', language);
  } catch (error) {
    console.error('Erro ao salvar preferência de idioma:', error);
  }
}

// Função para obter o idioma atual
export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

// Inicializa o idioma a partir do localStorage, se disponível
export function initLanguage(): void {
  try {
    const savedLanguage = localStorage.getItem('language') as SupportedLanguage;
    if (savedLanguage && translations[savedLanguage]) {
      currentLanguage = savedLanguage;
    }
  } catch (error) {
    console.error('Erro ao ler preferência de idioma:', error);
  }
}

// Inicializa o sistema de tradução
initLanguage();