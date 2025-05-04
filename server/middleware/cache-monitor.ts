/**
 * Middleware para monitoramento e controle do cache da aplicação
 * 
 * Este middleware fornece endpoints para visualizar, limpar e gerenciar
 * o cache da aplicação, expondo estatísticas e funcionalidades de manutenção.
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheStats } from '../utils/cache-service';
import { log } from '../utils/logger';

/**
 * Endpoint para listar estatísticas do cache
 */
export function getCacheStats(req: Request, res: Response) {
  try {
    const stats = cacheService.getStats();
    
    // Adicionar informações formatadas para melhor legibilidade
    const enhancedStats = {
      ...stats,
      hitRatio: stats.hits + stats.misses > 0 
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' 
        : '0%',
      sizeFormatted: formatBytes(stats.size),
      createdFormatted: stats.created.toISOString(),
      lastClearFormatted: stats.lastClear ? stats.lastClear.toISOString() : 'Nunca',
      uptime: formatDuration(Date.now() - stats.created.getTime())
    };
    
    res.json({ 
      success: true, 
      stats: enhancedStats 
    });
  } catch (error) {
    log(`Erro ao obter estatísticas do cache: ${error}`, 'cache-monitor', 'error');
    res.status(500).json({ 
      success: false, 
      error: `Erro ao obter estatísticas: ${error}` 
    });
  }
}

/**
 * Endpoint para limpar o cache
 */
export function clearCache(req: Request, res: Response) {
  try {
    // Estatísticas antes de limpar
    const statsBefore = cacheService.getStats();
    
    // Limpar cache
    cacheService.clear();
    
    log(`Cache limpo manualmente pelo usuário. ${statsBefore.keys} itens removidos.`, 'cache-monitor');
    
    res.json({ 
      success: true, 
      message: `Cache limpo com sucesso. ${statsBefore.keys} itens removidos.` 
    });
  } catch (error) {
    log(`Erro ao limpar cache: ${error}`, 'cache-monitor', 'error');
    res.status(500).json({ 
      success: false, 
      error: `Erro ao limpar cache: ${error}` 
    });
  }
}

/**
 * Endpoint para remover itens expirados do cache
 */
export function cleanExpiredCache(req: Request, res: Response) {
  try {
    const removed = cacheService.cleanExpired();
    
    log(`Limpeza manual de itens expirados do cache: ${removed} itens removidos.`, 'cache-monitor');
    
    res.json({ 
      success: true, 
      message: `${removed} itens expirados removidos do cache.` 
    });
  } catch (error) {
    log(`Erro ao limpar itens expirados: ${error}`, 'cache-monitor', 'error');
    res.status(500).json({ 
      success: false, 
      error: `Erro ao limpar itens expirados: ${error}` 
    });
  }
}

/**
 * Endpoint para obter um item específico do cache (com verificação de segurança)
 */
export function getCacheItem(req: Request, res: Response) {
  const { key } = req.params;
  
  if (!key) {
    return res.status(400).json({ 
      success: false, 
      error: 'Chave não fornecida' 
    });
  }
  
  try {
    const value = cacheService.get(key);
    
    if (value === undefined) {
      return res.status(404).json({
        success: false,
        error: 'Item não encontrado no cache'
      });
    }
    
    // Ocultar informações sensíveis
    // (esto serviria apenas para verificações técnicas, não expondo dados sensíveis)
    const isSensitive = key.toLowerCase().includes('token') || 
                        key.toLowerCase().includes('password') ||
                        key.toLowerCase().includes('secret') ||
                        key.toLowerCase().includes('key');
    
    return res.json({
      success: true,
      key,
      value: isSensitive ? '*** VALOR SENSÍVEL OCULTADO ***' : value,
      type: typeof value
    });
  } catch (error) {
    log(`Erro ao obter item do cache: ${error}`, 'cache-monitor', 'error');
    return res.status(500).json({ 
      success: false, 
      error: `Erro ao obter item do cache: ${error}` 
    });
  }
}

/**
 * Middleware para adicionar rotas de cache à aplicação
 */
export function cacheMonitorMiddleware(req: Request, res: Response, next: NextFunction) {
  // Adicionar rotas específicas para gerenciamento de cache apenas no ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/admin/cache')) {
    const route = req.path.replace('/api/admin/cache', '');
    
    // Estatísticas do cache
    if (route === '/stats' && req.method === 'GET') {
      return getCacheStats(req, res);
    }
    
    // Limpar cache
    if (route === '/clear' && req.method === 'POST') {
      return clearCache(req, res);
    }
    
    // Limpar itens expirados
    if (route === '/clean-expired' && req.method === 'POST') {
      return cleanExpiredCache(req, res);
    }
    
    // Obter item específico
    if (route.startsWith('/item/') && req.method === 'GET') {
      req.params.key = route.replace('/item/', '');
      return getCacheItem(req, res);
    }
  }
  
  // Se não for uma rota de cache, continuar com a execução normal
  next();
}

/**
 * Formata bytes para uma string legível (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formata duração em formato legível
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default cacheMonitorMiddleware;