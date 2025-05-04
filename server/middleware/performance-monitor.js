/**
 * Middleware para monitoramento de performance da aplicação
 *
 * Este middleware monitora e registra métricas de performance da aplicação,
 * incluindo uso de memória, tempo de CPU e tempo de resposta das requisições.
 */
import { log } from '../utils/logger';
import os from 'os';
// Intervalo para coleta de métricas em milissegundos
var METRICS_INTERVAL = 60000; // 1 minuto
// Último momento em que as métricas foram coletadas
var lastMetricsTime = 0;
// Threshold para requisições lentas (em ms)
var SLOW_REQUEST_THRESHOLD = 1000; // 1 segundo
// Dados de memória da última coleta
var lastMemoryUsage = {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0
};
/**
 * Coleta e registra métricas do sistema e da aplicação
 */
function collectMetrics() {
    var now = Date.now();
    // Evitar coleta muito frequente
    if (now - lastMetricsTime < METRICS_INTERVAL) {
        return;
    }
    lastMetricsTime = now;
    try {
        // Coletar métricas da memória
        var memoryUsage = process.memoryUsage();
        // Calcular diferenças desde a última coleta
        var memDiff = {
            rss: memoryUsage.rss - lastMemoryUsage.rss,
            heapTotal: memoryUsage.heapTotal - lastMemoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed - lastMemoryUsage.heapUsed,
            external: memoryUsage.external - lastMemoryUsage.external
        };
        // Atualizar valores para próxima comparação
        lastMemoryUsage = memoryUsage;
        // Coletar métricas de CPU
        var cpuUsage = process.cpuUsage();
        var cpuCount = os.cpus().length;
        var loadAvg = os.loadavg();
        // Registrar métricas no log
        log("Mem\u00F3ria: ".concat(formatBytes(memoryUsage.rss), " RSS, ").concat(formatBytes(memoryUsage.heapUsed), "/").concat(formatBytes(memoryUsage.heapTotal), " Heap"), 'performance');
        log("CPU: Load ".concat(loadAvg[0].toFixed(2), "/").concat(cpuCount, ", Uptime: ").concat(formatUptime(os.uptime())), 'performance');
        // Alertar sobre potenciais problemas de memória
        if (memDiff.heapUsed > 50 * 1024 * 1024) { // Se cresceu mais de 50MB desde a última coleta
            log("Alerta: Crescimento r\u00E1pido de mem\u00F3ria heap: +".concat(formatBytes(memDiff.heapUsed), " em ").concat(METRICS_INTERVAL / 1000, "s"), 'performance', 'warn');
        }
        // Verificar se a memória está em níveis críticos (acima de 80% do máximo configurado)
        var v8 = require('v8');
        var heapStats = v8.getHeapStatistics();
        var heapUsedPercentage = (memoryUsage.heapUsed / heapStats.heap_size_limit) * 100;
        if (heapUsedPercentage > 80) {
            log("Alerta: Uso cr\u00EDtico de mem\u00F3ria heap: ".concat(heapUsedPercentage.toFixed(1), "% do limite (").concat(formatBytes(heapStats.heap_size_limit), ")"), 'performance', 'error');
            // Forçar coleta de lixo se estiver realmente crítico
            if (heapUsedPercentage > 90 && global.gc) {
                log('Iniciando coleta de lixo forçada...', 'performance', 'warn');
                global.gc();
            }
        }
    }
    catch (error) {
        log("Erro ao coletar m\u00E9tricas: ".concat(error), 'performance', 'error');
    }
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
 * Formata tempo de atividade em formato legível
 */
function formatUptime(seconds) {
    var days = Math.floor(seconds / 86400);
    seconds %= 86400;
    var hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    var minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    var parts = [];
    if (days > 0)
        parts.push("".concat(days, "d"));
    if (hours > 0)
        parts.push("".concat(hours, "h"));
    if (minutes > 0)
        parts.push("".concat(minutes, "m"));
    if (seconds > 0 || parts.length === 0)
        parts.push("".concat(seconds, "s"));
    return parts.join(' ');
}
/**
 * Middleware para monitoramento de performance
 */
export function performanceMonitorMiddleware(req, res, next) {
    // Registrar o horário de início da requisição
    var startTime = Date.now();
    // Registrar memória no início da requisição
    var startMemory = process.memoryUsage().heapUsed;
    // Monitorar fim da requisição
    res.on('finish', function () {
        // Calcular tempo de resposta
        var responseTime = Date.now() - startTime;
        // Calcular uso de memória
        var memoryDiff = process.memoryUsage().heapUsed - startMemory;
        // Registrar métricas detalhadas apenas para requisições lentas
        if (responseTime > SLOW_REQUEST_THRESHOLD) {
            log("Requisi\u00E7\u00E3o lenta: ".concat(req.method, " ").concat(req.url, " - ").concat(responseTime, "ms, +").concat(formatBytes(memoryDiff), " mem\u00F3ria"), 'performance', 'warn');
        }
        // Coletar métricas gerais periodicamente
        collectMetrics();
    });
    next();
}
// Coletar métricas iniciais
collectMetrics();
// Agendar coleta periódica de métricas (a cada minuto)
setInterval(collectMetrics, METRICS_INTERVAL);
export default performanceMonitorMiddleware;
