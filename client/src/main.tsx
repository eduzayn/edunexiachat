import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/iframe-patch"; // Solução robusta para erros de iframe
import { initLanguage } from "./lib/translations"; // Inicializa o sistema de tradução

// Inicializa as traduções
initLanguage();

/**
 * Patch para corrigir o erro de WebSocket no Vite HMR
 * Este patch é aplicado em runtime e não afeta o código compilado
 */
setTimeout(() => {
  // Encontra todos os scripts na página
  const scripts = document.querySelectorAll('script');
  
  // Procura pelo script do Vite HMR
  scripts.forEach(script => {
    if (script.src && script.src.includes('/@vite/client')) {
      console.log('Script Vite HMR encontrado, aplicando patch');
      
      // Patch para o Vite HMR client
      const patchScript = document.createElement('script');
      patchScript.textContent = `
        // Sobrescrever a função setupWebSocket do Vite HMR
        window.__vite_patch_websocket = function() {
          try {
            if (window.__vite_patched) return;
            
            // Procurar pela função setupWebSocket no escopo global
            const originalSetupWebSocket = window.setupWebSocket || 
              Object.values(window).find(v => typeof v === 'function' && 
                v.toString().includes('socketProtocol') && 
                v.toString().includes('hostAndPath'));
            
            if (typeof originalSetupWebSocket === 'function') {
              const originalFunc = originalSetupWebSocket;
              window.setupWebSocket = function(protocol, hostAndPath, onCloseWithoutOpen) {
                // Certifique-se que o hostAndPath seja sempre completo
                if (hostAndPath && !hostAndPath.includes(':')) {
                  hostAndPath = window.location.host;
                }
                return originalFunc(protocol, hostAndPath, onCloseWithoutOpen);
              };
              window.__vite_patched = true;
              console.log('Patch aplicado para corrigir WebSocket');
            } else {
              console.warn('Função setupWebSocket não encontrada');
            }
          } catch (err) {
            console.error('Erro ao aplicar patch:', err);
          }
        };
        
        // Executar o patch
        window.__vite_patch_websocket();
      `;
      document.head.appendChild(patchScript);
    }
  });
}, 500);

createRoot(document.getElementById("root")!).render(<App />);
