/**
 * Utilitários para corrigir problemas comuns de renderização no React
 * 
 * Este arquivo contém patches e correções para problemas conhecidos
 * relacionados à manipulação do DOM em componentes React.
 */

/**
 * Esta função aplica um patch para evitar o erro "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 * Este erro ocorre quando React tenta remover um nó que já foi removido ou não é filho do nó pai
 */
export function applyDOMNodePatch(): void {
  // Salva a implementação original
  const originalRemoveChild = Node.prototype.removeChild;
  
  // Sobrescreve com uma versão que trata silenciosamente erros de removeChild
  // @ts-ignore - Ignoramos o erro de tipagem pois estamos alterando comportamento nativo
  Node.prototype.removeChild = function<T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child);
    } catch (error) {
      // Se o erro for sobre "not a child of this node", ignora silenciosamente
      if (error instanceof DOMException && 
          (error.name === 'NotFoundError' || error.message.includes('not a child'))) {
        console.warn('Prevented NotFoundError in removeChild. This is a harmless error that has been patched.');
        return child; // Retorna o nó que deveria ter sido removido
      }
      // Propaga outros erros
      throw error;
    }
  };

  console.log('Patch aplicado para corrigir erro de removeChild no DOM');
}

/**
 * Esta função aplica patches para problemas comuns de HMR (Hot Module Replacement)
 * que ocorrem durante o desenvolvimento
 */
export function applyHMRFixes(): void {
  // Detecta se estamos em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development' || (window as any)?.import?.meta?.env?.DEV) {
    // Patch para WebSockets em iframes
    if (window.parent !== window) {
      console.log('Iniciando patch de iframe');
      
      // Intercepta e corrige WebSockets para funcionar em iframes
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
        // Normaliza a URL para garantir que a conexão WebSocket funcione no iframe
        let fixedUrl = url;
        if (typeof url === 'string' && url.startsWith('/')) {
          const location = window.location;
          fixedUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${url}`;
        }
        
        return new originalWebSocket(fixedUrl, protocols);
      } as unknown as typeof WebSocket;
      
      // Preserva o construtor e propriedades do WebSocket original
      window.WebSocket.prototype = originalWebSocket.prototype;
      
      // Utiliza Object.defineProperties para definir propriedades constantes
      // já que as propriedades originais são somente leitura
      try {
        // @ts-ignore - Ignoramos erros de tipagem pois estamos trabalhando com propriedades nativas
        Object.defineProperties(window.WebSocket, {
          CONNECTING: { value: originalWebSocket.CONNECTING },
          OPEN: { value: originalWebSocket.OPEN },
          CLOSING: { value: originalWebSocket.CLOSING },
          CLOSED: { value: originalWebSocket.CLOSED }
        });
      } catch (e) {
        console.warn('Não foi possível definir constantes do WebSocket, mas o patch ainda funcionará', e);
      }
      
      console.log('Patch aplicado para corrigir WebSocket');
    }
  }
}

/**
 * Aplica todos os patches disponíveis
 */
export function applyAllFixes(): void {
  applyDOMNodePatch();
  applyHMRFixes();
}

// Exportação padrão para facilitar a importação
export default applyAllFixes;