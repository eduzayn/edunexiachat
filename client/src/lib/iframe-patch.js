/**
 * Solução para problemas de iframe e sandbox na aplicação
 * Este arquivo lida com vários erros de atributos de iframe que podem aparecer no console
 */

if (typeof window !== 'undefined') {
  // Executar quando o DOM estiver carregado
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando patch de iframe');
    fixIframeIssues();
    
    // Também monitorar alterações no DOM para pegar iframes inseridos dinamicamente
    const observer = new MutationObserver((mutations) => {
      let shouldFix = false;
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          shouldFix = true;
        }
      });
      
      if (shouldFix) {
        fixIframeIssues();
      }
    });
    
    observer.observe(document.body, { 
      childList: true,
      subtree: true 
    });
  });
}

/**
 * Função que corrige vários problemas comuns de iframe
 */
function fixIframeIssues() {
  // 1. Corrigir atributos sandbox inválidos
  const iframesWithSandbox = document.querySelectorAll('iframe[sandbox]');
  iframesWithSandbox.forEach(iframe => {
    const sandbox = iframe.getAttribute('sandbox');
    if (sandbox) {
      // Lista de flags válidas para o atributo sandbox
      const validFlags = [
        'allow-forms',
        'allow-pointer-lock',
        'allow-popups',
        'allow-same-origin',
        'allow-scripts',
        'allow-top-navigation',
        'allow-modals',
        'allow-popups-to-escape-sandbox',
        'allow-storage-access-by-user-activation',
        'allow-top-navigation-by-user-activation'
      ];
      
      // Remove flags inválidas
      const currentFlags = sandbox.split(' ');
      const validSandboxFlags = currentFlags.filter(flag => validFlags.includes(flag));
      
      // Define um novo valor de sandbox apenas com flags válidas
      if (validSandboxFlags.length > 0) {
        iframe.setAttribute('sandbox', validSandboxFlags.join(' '));
      } else {
        // Se não houver flags válidas, remova o atributo sandbox completamente
        iframe.removeAttribute('sandbox');
      }
      
      console.log('Corrigido atributo sandbox em iframe');
    }
  });
  
  // 2. Remover atributos allow com valores não reconhecidos
  const iframesWithAllow = document.querySelectorAll('iframe[allow]');
  iframesWithAllow.forEach(iframe => {
    const allow = iframe.getAttribute('allow');
    if (allow) {
      // Lista de recursos válidos para o atributo allow
      const validFeatures = [
        'camera',
        'microphone',
        'geolocation',
        'fullscreen',
        'autoplay',
        'picture-in-picture',
        'accelerometer',
        'gyroscope',
        'midi',
        'payment',
        'usb',
        'vr',
        'xr-spatial-tracking'
      ];
      
      // Parse e limpe a lista de recursos
      const features = allow.split(';').map(feature => feature.trim());
      const validFeatureList = features.filter(feature => {
        // Verifique se o feature começa com um dos recursos válidos
        return validFeatures.some(validFeature => 
          feature === validFeature || 
          feature.startsWith(`${validFeature} `) ||
          feature.startsWith(`${validFeature}=`)
        );
      });
      
      // Define um novo valor de allow apenas com recursos válidos
      if (validFeatureList.length > 0) {
        iframe.setAttribute('allow', validFeatureList.join('; '));
      } else {
        // Se não houver recursos válidos, remova o atributo allow completamente
        iframe.removeAttribute('allow');
      }
      
      console.log('Corrigido atributo allow em iframe');
    }
  });
  
  // 3. Adicionar permissões que podem estar faltando para que o iframe funcione corretamente
  document.querySelectorAll('iframe').forEach(iframe => {
    // Certifique-se de que o iframe tenha uma origem confiável antes de adicionar permissões
    const src = iframe.getAttribute('src');
    if (src && (src.startsWith('https://') || src.startsWith('http://localhost'))) {
      // Se o iframe não tiver sandbox, adicione um com permissões necessárias
      if (!iframe.hasAttribute('sandbox')) {
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      }
      
      // Se o iframe não tiver allow, adicione um com recursos comuns
      if (!iframe.hasAttribute('allow')) {
        iframe.setAttribute('allow', 'fullscreen');
      }
    }
  });
}

export default {};