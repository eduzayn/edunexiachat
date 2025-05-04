/**
 * Utilidade para Debugging de WebSockets
 * 
 * Este módulo fornece ferramentas para monitorar e depurar
 * conexões WebSocket, facilitando a visualização de eventos, 
 * mensagens e status das conexões.
 */

import { WebSocket } from 'ws';
import createLogger from './logger';

const logger = createLogger('websocket');

// Armazena dados de depuração
const wsDebugState = {
  totalConnections: 0,
  activeConnections: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0,
  // Armazena estatísticas por tipo de evento
  eventStats: new Map<string, {
    count: number,
    lastSentAt?: Date,
    lastReceivedAt?: Date
  }>()
};

/**
 * Converte um objeto WebSocket para uma representação amigável nos logs
 */
function formatWebSocketInfo(ws: WebSocket & { id?: string; userId?: number }) {
  return {
    id: ws.id,
    userId: ws.userId,
    readyState: ws.readyState,
    protocol: ws.protocol,
    bufferedAmount: ws.bufferedAmount
  };
}

/**
 * Registra uma conexão WebSocket e configura listeners de debug
 */
export function attachDebuggers(ws: WebSocket & { id?: string; userId?: number }) {
  wsDebugState.totalConnections++;
  wsDebugState.activeConnections++;
  
  logger.debug('Nova conexão WebSocket estabelecida', {
    connection: formatWebSocketInfo(ws),
    stats: {
      totalConnections: wsDebugState.totalConnections,
      activeConnections: wsDebugState.activeConnections
    }
  });
  
  // Intercepta mensagens recebidas
  const originalOnMessage = ws.onmessage;
  ws.onmessage = function(event) {
    wsDebugState.messagesReceived++;
    
    try {
      // Tenta processar como JSON para melhor visualização
      const parsedData = JSON.parse(event.data.toString());
      
      // Atualiza estatísticas do evento
      const eventType = parsedData.type || 'unknown';
      if (!wsDebugState.eventStats.has(eventType)) {
        wsDebugState.eventStats.set(eventType, {
          count: 0
        });
      }
      const stats = wsDebugState.eventStats.get(eventType)!;
      stats.count++;
      stats.lastReceivedAt = new Date();
      
      logger.debug('Mensagem WebSocket recebida', {
        event: parsedData,
        connection: formatWebSocketInfo(ws)
      });
    } catch (err) {
      // Se não for JSON, loga como string
      logger.debug('Mensagem WebSocket recebida (não-JSON)', {
        data: event.data.toString(),
        connection: formatWebSocketInfo(ws)
      });
    }
    
    // Chama o handler original, se existir
    if (originalOnMessage) {
      originalOnMessage.call(ws, event);
    }
  };
  
  // Intercepta mensagens enviadas
  const originalSend = ws.send;
  ws.send = function(data: any, callback?: (err?: Error) => void) {
    wsDebugState.messagesSent++;
    
    try {
      let logData: any;
      
      // Tenta processar como JSON para melhor visualização
      if (typeof data === 'string') {
        logData = JSON.parse(data);
        
        // Atualiza estatísticas do evento
        const eventType = logData.type || 'unknown';
        if (!wsDebugState.eventStats.has(eventType)) {
          wsDebugState.eventStats.set(eventType, {
            count: 0
          });
        }
        const stats = wsDebugState.eventStats.get(eventType)!;
        stats.count++;
        stats.lastSentAt = new Date();
      } else {
        logData = data;
      }
      
      logger.debug('Mensagem WebSocket enviada', {
        data: logData,
        connection: formatWebSocketInfo(ws)
      });
    } catch (err) {
      // Se não for JSON, loga como string ou objeto
      logger.debug('Mensagem WebSocket enviada (formato raw)', {
        data: typeof data === 'string' ? data : '[Binary/Object]',
        connection: formatWebSocketInfo(ws)
      });
    }
    
    // Chama o método original
    originalSend.call(ws, data, callback);
  };
  
  // Monitora fechamento da conexão
  ws.on('close', (code, reason) => {
    wsDebugState.activeConnections--;
    
    logger.debug('Conexão WebSocket fechada', {
      connection: formatWebSocketInfo(ws),
      code,
      reason: reason.toString(),
      stats: {
        totalConnections: wsDebugState.totalConnections,
        activeConnections: wsDebugState.activeConnections
      }
    });
  });
  
  // Monitora erros
  ws.on('error', (error) => {
    wsDebugState.errors++;
    
    logger.error('Erro na conexão WebSocket', {
      connection: formatWebSocketInfo(ws),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  });
  
  return ws;
}

/**
 * Inicia o monitoramento periódico de estatísticas WebSocket
 */
export function initWebSocketMonitoring(interval = 60000): void {
  setInterval(() => {
    // Converte Map para objeto para melhor visualização nos logs
    const eventStatsObj: Record<string, any> = {};
    wsDebugState.eventStats.forEach((stat, type) => {
      eventStatsObj[type] = stat;
    });
    
    logger.info('Estatísticas de WebSocket', {
      totalConnections: wsDebugState.totalConnections,
      activeConnections: wsDebugState.activeConnections,
      messagesReceived: wsDebugState.messagesReceived,
      messagesSent: wsDebugState.messagesSent,
      errors: wsDebugState.errors,
      events: eventStatsObj
    });
  }, interval);
  
  logger.info('Monitoramento de WebSocket iniciado');
}

/**
 * Retorna as estatísticas atuais de WebSocket
 */
export function getWebSocketStats() {
  // Converte Map para objeto
  const eventStatsObj: Record<string, any> = {};
  wsDebugState.eventStats.forEach((stat, type) => {
    eventStatsObj[type] = stat;
  });
  
  return {
    totalConnections: wsDebugState.totalConnections,
    activeConnections: wsDebugState.activeConnections,
    messagesReceived: wsDebugState.messagesReceived,
    messagesSent: wsDebugState.messagesSent,
    errors: wsDebugState.errors,
    events: eventStatsObj
  };
}

export default {
  attachDebuggers,
  initWebSocketMonitoring,
  getWebSocketStats
};