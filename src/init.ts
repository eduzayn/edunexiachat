/**
 * Arquivo de inicialização
 * 
 * Este arquivo é carregado na inicialização da aplicação e aplica
 * configurações, patches e inicializadores necessários.
 */

import applyAllFixes from './utils/react-fixes';

// Aplica todos os patches e correções logo no carregamento
applyAllFixes();

// Exporta como módulo para ser importado no ponto de entrada da aplicação
export default {
  initialized: true
};