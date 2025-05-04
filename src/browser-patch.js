/**
 * Script para aplicar patches no navegador
 * 
 * Este arquivo é injetado no HTML da aplicação para corrigir
 * problemas comuns do DOM e do React antes mesmo da inicialização
 * do framework React.
 */

(function() {
  console.log('Iniciando aplicação de patches...');
  
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
  
  // Patch para WebSockets em iframes
  if (window.parent !== window) {
    console.log('Iniciando patch de iframe');
    
    // Patch para fetch em iframes
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
      // Ensure the resource is an absolute URL when in an iframe
      if (typeof resource === 'string' && resource.startsWith('/')) {
        const url = new URL(resource, window.location.origin);
        return originalFetch(url.toString(), init);
      }
      return originalFetch(resource, init);
    };
    
    // Detecta onde o script HMR do Vite está sendo carregado
    const scriptElements = document.querySelectorAll('script');
    let hmrScriptFound = false;
    
    scriptElements.forEach(script => {
      if (script.src && script.src.includes('@vite/client')) {
        console.log('Script Vite HMR encontrado, aplicando patch');
        hmrScriptFound = true;
        
        // Garante que o WebSocket use o mesmo host que o iframe
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
          if (typeof url === 'string') {
            // Corrige URL do WebSocket para usar o mesmo host
            const currentLocation = window.location;
            const wsPrefix = currentLocation.protocol === 'https:' ? 'wss:' : 'ws:';
            
            if (url.startsWith('/')) {
              url = `${wsPrefix}//${currentLocation.host}${url}`;
            } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
              // Substitui localhost pela URL real
              const urlObj = new URL(url);
              url = `${wsPrefix}//${currentLocation.host}${urlObj.pathname}${urlObj.search}`;
            }
          }
          
          return new originalWebSocket(url, protocols);
        };
        
        // Preserva o construtor e propriedades do WebSocket original
        window.WebSocket.prototype = originalWebSocket.prototype;
        window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
        window.WebSocket.OPEN = originalWebSocket.OPEN;
        window.WebSocket.CLOSING = originalWebSocket.CLOSING;
        window.WebSocket.CLOSED = originalWebSocket.CLOSED;
        
        console.log('Patch aplicado para corrigir WebSocket');
      }
    });
    
    // Se não encontrou o script, adiciona um observer para detectar quando for carregado
    if (!hmrScriptFound) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'SCRIPT' && node.src && node.src.includes('@vite/client')) {
                console.log('Script Vite HMR detectado dinamicamente, aplicando patch');
                
                // Aplica o patch e desconecta o observer
                const originalWebSocket = window.WebSocket;
                window.WebSocket = function(url, protocols) {
                  if (typeof url === 'string') {
                    const currentLocation = window.location;
                    const wsPrefix = currentLocation.protocol === 'https:' ? 'wss:' : 'ws:';
                    
                    if (url.startsWith('/')) {
                      url = `${wsPrefix}//${currentLocation.host}${url}`;
                    } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
                      const urlObj = new URL(url);
                      url = `${wsPrefix}//${currentLocation.host}${urlObj.pathname}${urlObj.search}`;
                    }
                  }
                  
                  return new originalWebSocket(url, protocols);
                };
                
                window.WebSocket.prototype = originalWebSocket.prototype;
                window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
                window.WebSocket.OPEN = originalWebSocket.OPEN;
                window.WebSocket.CLOSING = originalWebSocket.CLOSING;
                window.WebSocket.CLOSED = originalWebSocket.CLOSED;
                
                console.log('Patch aplicado para corrigir WebSocket');
                observer.disconnect();
              }
            });
          }
        });
      });
      
      observer.observe(document.documentElement, { 
        childList: true,
        subtree: true
      });
    }
  }
  
  // Busca dados do usuário automaticamente para evitar carregamentos duplicados
  function fetchUserData() {
    console.log('Fetching user data...');
    fetch('/api/user')
      .then(response => response.json())
      .then(data => {
        console.log('User data fetched:', data);
        window.__USER_DATA__ = data;
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
      });
  }
  
  // Executa após o DOM ter carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchUserData);
  } else {
    fetchUserData();
  }
  
  console.log('Patches aplicados com sucesso');
})();