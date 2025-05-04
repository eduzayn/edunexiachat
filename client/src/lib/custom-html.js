/**
 * Este arquivo corrige o erro de atributo sandbox inválido no iframe
 * que aparece no console do navegador
 */

if (typeof window !== 'undefined') {
  // Executar quando o DOM estiver carregado
  document.addEventListener('DOMContentLoaded', () => {
    // Função para corrigir atributos sandbox em iframes
    const fixIframeSandboxAttributes = () => {
      const iframes = document.querySelectorAll('iframe[sandbox]');
      
      iframes.forEach(iframe => {
        const currentSandbox = iframe.getAttribute('sandbox');
        if (currentSandbox && currentSandbox.includes('allow-downloads-without-user-activation')) {
          // Remover o atributo inválido e manter os válidos
          const validAttributes = currentSandbox
            .split(' ')
            .filter(attr => attr !== 'allow-downloads-without-user-activation')
            .join(' ');
          
          iframe.setAttribute('sandbox', validAttributes);
          console.log('Corrigido atributo sandbox em iframe');
        }
      });
    };

    // Executar imediatamente
    fixIframeSandboxAttributes();
    
    // Também observar mudanças no DOM para capturar iframes adicionados dinamicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          fixIframeSandboxAttributes();
        }
      });
    });
    
    observer.observe(document.body, { 
      childList: true,
      subtree: true 
    });
  });
}

export default {};