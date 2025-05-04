/**
 * Middleware para monitoramento de performance da aplicação
 * 
 * Este middleware monitora e registra métricas de performance da aplicação,
 * incluindo uso de memória, tempo de CPU e tempo de resposta das requisições.
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';
import os from 'os';

// Intervalo para coleta de métricas em milissegundos
const METRICS_INTERVAL = 60000; // 1 minuto

// Último momento em que as métricas foram coletadas
let lastMetricsTime = 0;

// Threshold para requisições lentas (em ms)
const SLOW_REQUEST_THRESHOLD = 1000; // 1 segundo

// Dados de memória da última coleta
let lastMemoryUsage = {
  rss: 0,
  heapTotal: 0,
  heapUsed: 0,
  external: 0
};

/**
 * Coleta e registra métricas do sistema e da aplicação
 */
function collectMetrics() {
  const now = Date.now();

  // Evitar coleta muito frequente
  if (now - lastMetricsTime < METRICS_INTERVAL) {
    return;
  }

  lastMetricsTime = now;

  try {
    // Coletar métricas da memória
    const memoryUsage = process.memoryUsage();
    
    // Calcular diferenças desde a última coleta
    const memDiff = {
      rss: memoryUsage.rss - lastMemoryUsage.rss,
      heapTotal: memoryUsage.heapTotal - lastMemoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed - lastMemoryUsage.heapUsed,
      external: memoryUsage.external - lastMemoryUsage.external
    };
    
    // Atualizar valores para próxima comparação
    lastMemoryUsage = memoryUsage;
    
    // Coletar métricas de CPU
    const cpuUsage = process.cpuUsage();
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();
    
    // Registrar métricas no log
    log(
      `Memória: ${formatBytes(memoryUsage.rss)} RSS, ${formatBytes(memoryUsage.heapUsed)}/${formatBytes(memoryUsage.heapTotal)} Heap`,
      'performance'
    );
    
    log(
      `CPU: Load ${loadAvg[0].toFixed(2)}/${cpuCount}, Uptime: ${formatUptime(os.uptime())}`,
      'performance'
    );
    
    // Alertar sobre potenciais problemas de memória
    if (memDiff.heapUsed > 50 * 1024 * 1024) { // Se cresceu mais de 50MB desde a última coleta
      log(
        `Alerta: Crescimento rápido de memória heap: +${formatBytes(memDiff.heapUsed)} em ${METRICS_INTERVAL/1000}s`,
        'performance',
        'warn'
      );
    }
    
    // Verificar se a memória está em níveis críticos (acima de 80% do máximo configurado)
    const v8 = require('v8');
    const heapStats = v8.getHeapStatistics();
    const heapUsedPercentage = (memoryUsage.heapUsed / heapStats.heap_size_limit) * 100;
    
    if (heapUsedPercentage > 80) {
      log(
        `Alerta: Uso crítico de memória heap: ${heapUsedPercentage.toFixed(1)}% do limite (${formatBytes(heapStats.heap_size_limit)})`,
        'performance',
        'error'
      );
      
      // Forçar coleta de lixo se estiver realmente crítico
      if (heapUsedPercentage > 90 && global.gc) {
        log('Iniciando coleta de lixo forçada...', 'performance', 'warn');
        global.gc();
      }
    }
  } catch (error) {
    log(`Erro ao coletar métricas: ${error}`, 'performance', 'error');
  }
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
 * Formata tempo de atividade em formato legível
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

/**
 * Middleware para monitoramento de performance
 */
export function performanceMonitorMiddleware(req: Request, res: Response, next: NextFunction) {
  // Registrar o horário de início da requisição
  const startTime = Date.now();
  
  // Registrar memória no início da requisição
  const startMemory = process.memoryUsage().heapUsed;
  
  // Monitorar fim da requisição
  res.on('finish', () => {
    // Calcular tempo de resposta
    const responseTime = Date.now() - startTime;
    
    // Calcular uso de memória
    const memoryDiff = process.memoryUsage().heapUsed - startMemory;
    
    // Registrar métricas detalhadas apenas para requisições lentas
    if (responseTime > SLOW_REQUEST_THRESHOLD) {
      log(
        `Requisição lenta: ${req.method} ${req.url} - ${responseTime}ms, +${formatBytes(memoryDiff)} memória`,
        'performance',
        'warn'
      );
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