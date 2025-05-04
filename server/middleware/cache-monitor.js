/**
 * Middleware para monitoramento e controle do cache da aplicação
 *
 * Este middleware fornece endpoints para visualizar, limpar e gerenciar
 * o cache da aplicação, expondo estatísticas e funcionalidades de manutenção.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { cacheService } from '../utils/cache-service';
import { log } from '../utils/logger';
/**
 * Endpoint para listar estatísticas do cache
 */
export function getCacheStats(req, res) {
    try {
        var stats = cacheService.getStats();
        // Adicionar informações formatadas para melhor legibilidade
        var enhancedStats = __assign(__assign({}, stats), { hitRatio: stats.hits + stats.misses > 0
                ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
                : '0%', sizeFormatted: formatBytes(stats.size), createdFormatted: stats.created.toISOString(), lastClearFormatted: stats.lastClear ? stats.lastClear.toISOString() : 'Nunca', uptime: formatDuration(Date.now() - stats.created.getTime()) });
        res.json({
            success: true,
            stats: enhancedStats
        });
    }
    catch (error) {
        log("Erro ao obter estat\u00EDsticas do cache: ".concat(error), 'cache-monitor', 'error');
        res.status(500).json({
            success: false,
            error: "Erro ao obter estat\u00EDsticas: ".concat(error)
        });
    }
}
/**
 * Endpoint para limpar o cache
 */
export function clearCache(req, res) {
    try {
        // Estatísticas antes de limpar
        var statsBefore = cacheService.getStats();
        // Limpar cache
        cacheService.clear();
        log("Cache limpo manualmente pelo usu\u00E1rio. ".concat(statsBefore.keys, " itens removidos."), 'cache-monitor');
        res.json({
            success: true,
            message: "Cache limpo com sucesso. ".concat(statsBefore.keys, " itens removidos.")
        });
    }
    catch (error) {
        log("Erro ao limpar cache: ".concat(error), 'cache-monitor', 'error');
        res.status(500).json({
            success: false,
            error: "Erro ao limpar cache: ".concat(error)
        });
    }
}
/**
 * Endpoint para remover itens expirados do cache
 */
export function cleanExpiredCache(req, res) {
    try {
        var removed = cacheService.cleanExpired();
        log("Limpeza manual de itens expirados do cache: ".concat(removed, " itens removidos."), 'cache-monitor');
        res.json({
            success: true,
            message: "".concat(removed, " itens expirados removidos do cache.")
        });
    }
    catch (error) {
        log("Erro ao limpar itens expirados: ".concat(error), 'cache-monitor', 'error');
        res.status(500).json({
            success: false,
            error: "Erro ao limpar itens expirados: ".concat(error)
        });
    }
}
/**
 * Endpoint para obter um item específico do cache (com verificação de segurança)
 */
export function getCacheItem(req, res) {
    var key = req.params.key;
    if (!key) {
        return res.status(400).json({
            success: false,
            error: 'Chave não fornecida'
        });
    }
    try {
        var value = cacheService.get(key);
        if (value === undefined) {
            return res.status(404).json({
                success: false,
                error: 'Item não encontrado no cache'
            });
        }
        // Ocultar informações sensíveis
        // (esto serviria apenas para verificações técnicas, não expondo dados sensíveis)
        var isSensitive = key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('secret') ||
            key.toLowerCase().includes('key');
        return res.json({
            success: true,
            key: key,
            value: isSensitive ? '*** VALOR SENSÍVEL OCULTADO ***' : value,
            type: typeof value
        });
    }
    catch (error) {
        log("Erro ao obter item do cache: ".concat(error), 'cache-monitor', 'error');
        return res.status(500).json({
            success: false,
            error: "Erro ao obter item do cache: ".concat(error)
        });
    }
}
/**
 * Middleware para adicionar rotas de cache à aplicação
 */
export function cacheMonitorMiddleware(req, res, next) {
    // Adicionar rotas específicas para gerenciamento de cache apenas no ambiente de desenvolvimento
    if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/admin/cache')) {
        var route = req.path.replace('/api/admin/cache', '');
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
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * Formata duração em formato legível
 */
function formatDuration(ms) {
    var seconds = Math.floor(ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    if (days > 0) {
        return "".concat(days, "d ").concat(hours % 24, "h");
    }
    else if (hours > 0) {
        return "".concat(hours, "h ").concat(minutes % 60, "m");
    }
    else if (minutes > 0) {
        return "".concat(minutes, "m ").concat(seconds % 60, "s");
    }
    else {
        return "".concat(seconds, "s");
    }
}
export default cacheMonitorMiddleware;
