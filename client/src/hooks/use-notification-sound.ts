import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook para gerenciar sons de notificações de uma forma compatível
 * com a política de autoplay dos navegadores modernos
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const interactionOccurred = useRef(false);
  
  // Inicializar o objeto de áudio apenas após interação do usuário
  const initializeAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);
  
  // Reproduzir som de notificação com segurança
  const playNotificationSound = useCallback(() => {
    // Só reproduzimos o som se já houve interação do usuário
    if (interactionOccurred.current && audioRef.current) {
      // Usamos catch para silenciosamente ignorar erros de reprodução
      // que podem ocorrer por várias razões no navegador
      audioRef.current.play().catch(err => {
        console.warn('Não foi possível reproduzir o som de notificação:', err);
      });
    }
  }, []);
  
  // Registrar interação do usuário
  useEffect(() => {
    const handleInteraction = () => {
      interactionOccurred.current = true;
      initializeAudio();
      
      // Remover event listeners após a primeira interação
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initializeAudio]);
  
  // Limpar recursos quando o componente for desmontado
  useEffect(() => {
    return () => {
      audioRef.current = null;
    };
  }, []);
  
  return { playNotificationSound };
}