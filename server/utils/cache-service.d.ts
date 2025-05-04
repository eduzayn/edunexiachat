/**
 * Serviço de cache para a aplicação
 *
 * Este arquivo fornece um serviço de cache para armazenar dados em memória
 * que são frequentemente acessados, reduzindo a carga no banco de dados.
 */
export interface CacheStats {
    hits: number;
    misses: number;
    keys: number;
    size: number;
    created: Date;
    lastClear: Date | null;
}
/**
 * Implementação básica de cache em memória
 */
declare class MemoryCache {
    private cache;
    private ttls;
    private stats;
    private maxSize;
    /**
     * Cria uma nova instância do cache
     * @param maxSize Tamanho máximo do cache em bytes (aproximado)
     */
    constructor(maxSize?: number);
    /**
     * Obtém um valor do cache
     * @param key Chave para busca
     * @returns O valor se encontrado, ou undefined
     */
    get<T>(key: string): T | undefined;
    /**
     * Armazena um valor no cache
     * @param key Chave para armazenamento
     * @param value Valor a ser armazenado
     * @param ttl Tempo de vida em ms (opcional)
     * @returns true se armazenado com sucesso
     */
    set<T>(key: string, value: T, ttl?: number): boolean;
    /**
     * Remove um item do cache
     * @param key Chave a ser removida
     * @returns true se o item existia e foi removido
     */
    delete(key: string): boolean;
    /**
     * Limpa todo o cache
     */
    clear(): void;
    /**
     * Obtém as estatísticas do cache
     * @returns Estatísticas atuais
     */
    getStats(): CacheStats;
    /**
     * Remove itens expirados do cache
     * @returns Número de itens removidos
     */
    cleanExpired(): number;
    /**
     * Estima o tamanho em bytes de um item de cache
     * @param key Chave do item
     * @param value Valor do item
     * @returns Tamanho aproximado em bytes
     */
    private estimateSize;
    /**
     * Remove os itens mais antigos do cache até liberar o espaço especificado
     * @param bytesToFree Bytes a liberar
     * @returns Número de itens removidos
     */
    private evictOldest;
}
export declare const cacheService: MemoryCache;
export {};
