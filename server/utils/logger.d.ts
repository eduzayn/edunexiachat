/**
 * Utilitário de log centralizado para a aplicação
 *
 * Este módulo fornece funções para logging consistente em toda a aplicação,
 * com suporte a diferentes níveis de log e categorias.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
/**
 * Função principal de log
 *
 * @param message Mensagem a ser registrada
 * @param category Categoria do log (ex: 'database', 'api', etc.)
 * @param level Nível de severidade do log
 */
export declare function log(message: string, category?: string, level?: LogLevel): void;
/**
 * Cria uma função de log específica para uma categoria
 *
 * @param category Nome da categoria
 * @returns Função de log configurada para a categoria
 */
export declare function createCategoryLogger(category: string): (message: string, level?: LogLevel) => void;
export declare const debug: (message: string, category?: string) => void;
export declare const info: (message: string, category?: string) => void;
export declare const warn: (message: string, category?: string) => void;
export declare const error: (message: string, category?: string) => void;
export declare const fatal: (message: string, category?: string) => void;
export declare function logObject(obj: any, message?: string, category?: string, level?: LogLevel): void;
declare const _default: {
    log: typeof log;
    debug: (message: string, category?: string) => void;
    info: (message: string, category?: string) => void;
    warn: (message: string, category?: string) => void;
    error: (message: string, category?: string) => void;
    fatal: (message: string, category?: string) => void;
    logObject: typeof logObject;
    createCategoryLogger: typeof createCategoryLogger;
};
export default _default;
