/**
 * Utilitário de log centralizado para a aplicação
 * 
 * Este módulo fornece funções para logging consistente em toda a aplicação,
 * com suporte a diferentes níveis de log e categorias.
 */

import fs from 'fs';
import path from 'path';
import util from 'util';

// Tipos de níveis de log
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Configuração de cores para o console
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Cores de texto
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Cores de fundo
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Configuração de cores por nível de log
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.cyan,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
  fatal: COLORS.bgRed + COLORS.white + COLORS.bright,
};

// Diretório para armazenar logs
const LOG_DIR = path.join(process.cwd(), 'logs');

// Garantir que o diretório de logs exista
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Arquivo de log atual
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);

/**
 * Função principal de log
 * 
 * @param message Mensagem a ser registrada
 * @param category Categoria do log (ex: 'database', 'api', etc.)
 * @param level Nível de severidade do log
 */
export function log(message: string, category: string = 'app', level: LogLevel = 'info'): void {
  const timestamp = new Date().toISOString();
  const formattedCategory = category.padEnd(12).substring(0, 12);
  
  // Formatar mensagem para console com cores
  const consoleMsg = `${COLORS.dim}${timestamp}${COLORS.reset} ${LEVEL_COLORS[level]}[${level.toUpperCase()}]${COLORS.reset} [${formattedCategory}] ${message}`;
  
  // Formatar mensagem para arquivo (sem cores)
  const fileMsg = `${timestamp} [${level.toUpperCase()}] [${formattedCategory}] ${message}`;
  
  // Exibir no console
  console.log(consoleMsg);
  
  // Salvar no arquivo de log
  fs.appendFileSync(LOG_FILE, fileMsg + '\n');
  
  // Se for erro, registrar stack trace
  if (level === 'error' || level === 'fatal') {
    const stack = new Error().stack?.split('\n').slice(2).join('\n');
    if (stack) {
      console.log(`${COLORS.dim}${stack}${COLORS.reset}`);
      fs.appendFileSync(LOG_FILE, `Stack: ${stack}\n`);
    }
  }
}

/**
 * Cria uma função de log específica para uma categoria
 * 
 * @param category Nome da categoria
 * @returns Função de log configurada para a categoria
 */
export function createCategoryLogger(category: string) {
  return (message: string, level: LogLevel = 'info') => {
    log(message, category, level);
  };
}

// Exportar funções de conveniência para cada nível
export const debug = (message: string, category: string = 'app') => log(message, category, 'debug');
export const info = (message: string, category: string = 'app') => log(message, category, 'info');
export const warn = (message: string, category: string = 'app') => log(message, category, 'warn');
export const error = (message: string, category: string = 'app') => log(message, category, 'error');
export const fatal = (message: string, category: string = 'app') => log(message, category, 'fatal');

// Função para registrar objetos complexos
export function logObject(obj: any, message: string = 'Object log', category: string = 'app', level: LogLevel = 'debug'): void {
  const objString = util.inspect(obj, { depth: 5, colors: false });
  log(`${message}:\n${objString}`, category, level);
}

export default {
  log,
  debug,
  info,
  warn,
  error,
  fatal,
  logObject,
  createCategoryLogger
};