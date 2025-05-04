/**
 * Utilitário de log centralizado para a aplicação
 *
 * Este módulo fornece funções para logging consistente em toda a aplicação,
 * com suporte a diferentes níveis de log e categorias.
 */
import fs from 'fs';
import path from 'path';
import util from 'util';
// Configuração de cores para o console
var COLORS = {
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
var LEVEL_COLORS = {
    debug: COLORS.cyan,
    info: COLORS.green,
    warn: COLORS.yellow,
    error: COLORS.red,
    fatal: COLORS.bgRed + COLORS.white + COLORS.bright,
};
// Diretório para armazenar logs
var LOG_DIR = path.join(process.cwd(), 'logs');
// Garantir que o diretório de logs exista
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
// Arquivo de log atual
var LOG_FILE = path.join(LOG_DIR, "app-".concat(new Date().toISOString().split('T')[0], ".log"));
/**
 * Função principal de log
 *
 * @param message Mensagem a ser registrada
 * @param category Categoria do log (ex: 'database', 'api', etc.)
 * @param level Nível de severidade do log
 */
export function log(message, category, level) {
    var _a;
    if (category === void 0) { category = 'app'; }
    if (level === void 0) { level = 'info'; }
    var timestamp = new Date().toISOString();
    var formattedCategory = category.padEnd(12).substring(0, 12);
    // Formatar mensagem para console com cores
    var consoleMsg = "".concat(COLORS.dim).concat(timestamp).concat(COLORS.reset, " ").concat(LEVEL_COLORS[level], "[").concat(level.toUpperCase(), "]").concat(COLORS.reset, " [").concat(formattedCategory, "] ").concat(message);
    // Formatar mensagem para arquivo (sem cores)
    var fileMsg = "".concat(timestamp, " [").concat(level.toUpperCase(), "] [").concat(formattedCategory, "] ").concat(message);
    // Exibir no console
    console.log(consoleMsg);
    // Salvar no arquivo de log
    fs.appendFileSync(LOG_FILE, fileMsg + '\n');
    // Se for erro, registrar stack trace
    if (level === 'error' || level === 'fatal') {
        var stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.split('\n').slice(2).join('\n');
        if (stack) {
            console.log("".concat(COLORS.dim).concat(stack).concat(COLORS.reset));
            fs.appendFileSync(LOG_FILE, "Stack: ".concat(stack, "\n"));
        }
    }
}
/**
 * Cria uma função de log específica para uma categoria
 *
 * @param category Nome da categoria
 * @returns Função de log configurada para a categoria
 */
export function createCategoryLogger(category) {
    return function (message, level) {
        if (level === void 0) { level = 'info'; }
        log(message, category, level);
    };
}
// Exportar funções de conveniência para cada nível
export var debug = function (message, category) {
    if (category === void 0) { category = 'app'; }
    return log(message, category, 'debug');
};
export var info = function (message, category) {
    if (category === void 0) { category = 'app'; }
    return log(message, category, 'info');
};
export var warn = function (message, category) {
    if (category === void 0) { category = 'app'; }
    return log(message, category, 'warn');
};
export var error = function (message, category) {
    if (category === void 0) { category = 'app'; }
    return log(message, category, 'error');
};
export var fatal = function (message, category) {
    if (category === void 0) { category = 'app'; }
    return log(message, category, 'fatal');
};
// Função para registrar objetos complexos
export function logObject(obj, message, category, level) {
    if (message === void 0) { message = 'Object log'; }
    if (category === void 0) { category = 'app'; }
    if (level === void 0) { level = 'debug'; }
    var objString = util.inspect(obj, { depth: 5, colors: false });
    log("".concat(message, ":\n").concat(objString), category, level);
}
export default {
    log: log,
    debug: debug,
    info: info,
    warn: warn,
    error: error,
    fatal: fatal,
    logObject: logObject,
    createCategoryLogger: createCategoryLogger
};
