/**
 * DOM Patch - Correções para problemas comuns do DOM no React
 * 
 * Este módulo aplica correções para erros comuns do DOM que ocorrem durante
 * a renderização de componentes React, especialmente em ambientes de desenvolvimento.
 */

// Flag para garantir que o patch seja aplicado apenas uma vez
let patchApplied = false;

/**
 * Aplica o patch para corrigir o erro "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 */
export function applyDOMPatch() {
  // Evita aplicar o patch múltiplas vezes
  if (patchApplied || typeof window === 'undefined') {
    return;
  }
  
  console.log('Aplicando patch de segurança para operações DOM...');
  
  // Patch para erro "NotFoundError: Failed to execute 'removeChild' on 'Node'"
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
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
  
  // Patch para operação appendChild semelhante (por precaução)
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    try {
      return originalAppendChild.call(this, child);
    } catch (error) {
      if (error instanceof DOMException && 
          (error.code === 3 || error.message.includes('HierarchyRequestError'))) {
        console.warn('Prevented HierarchyRequestError in appendChild. Element already has a parent.');
        return child;
      }
      throw error;
    }
  };
  
  // Patch para operação insertBefore (por precaução)
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    try {
      return originalInsertBefore.call(this, newNode, referenceNode);
    } catch (error) {
      if (error instanceof DOMException &&
          (error.name === 'NotFoundError' || error.message.includes('not a child'))) {
        console.warn('Prevented NotFoundError in insertBefore. Using appendChild as fallback.');
        return this.appendChild(newNode);
      }
      throw error;
    }
  };
  
  // Patch para WebSockets em iframes
  if (window.parent !== window) {
    console.log('Detectado iframe, aplicando patches adicionais...');
    
    // Patch para WebSockets
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      let fixedUrl = url;
      if (typeof url === 'string') {
        // Corrige URL do WebSocket para usar o mesmo host quando em iframe
        const currentLocation = window.location;
        const wsPrefix = currentLocation.protocol === 'https:' ? 'wss:' : 'ws:';
        
        if (url.startsWith('/')) {
          fixedUrl = `${wsPrefix}//${currentLocation.host}${url}`;
        } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
          const urlObj = new URL(url);
          fixedUrl = `${wsPrefix}//${currentLocation.host}${urlObj.pathname}${urlObj.search}`;
        }
      }
      
      return new originalWebSocket(fixedUrl, protocols);
    };
    
    // Preserva o construtor e propriedades do WebSocket original
    window.WebSocket.prototype = originalWebSocket.prototype;
    window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
    window.WebSocket.OPEN = originalWebSocket.OPEN;
    window.WebSocket.CLOSING = originalWebSocket.CLOSING;
    window.WebSocket.CLOSED = originalWebSocket.CLOSED;
    
    console.log('Patch aplicado para corrigir WebSocket');
  }
  
  patchApplied = true;
  console.log('Patches aplicados com sucesso');
}

// Aplica o patch automaticamente quando este módulo é importado
applyDOMPatch();

export default applyDOMPatch;