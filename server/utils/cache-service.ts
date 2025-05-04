/**
 * Serviço de cache para a aplicação
 * 
 * Este arquivo fornece um serviço de cache para armazenar dados em memória
 * que são frequentemente acessados, reduzindo a carga no banco de dados.
 */

import { log } from './logger';

// Tipo para estatísticas do cache
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  size: number; // em bytes (aproximado)
  created: Date;
  lastClear: Date | null;
}

/**
 * Implementação básica de cache em memória
 */
class MemoryCache {
  private cache: Map<string, any>;
  private ttls: Map<string, number>;
  private stats: CacheStats;
  private maxSize: number; // tamanho máximo em bytes (aproximado)
  
  /**
   * Cria uma nova instância do cache
   * @param maxSize Tamanho máximo do cache em bytes (aproximado)
   */
  constructor(maxSize: number = 50 * 1024 * 1024) { // 50MB por padrão
    this.cache = new Map<string, any>();
    this.ttls = new Map<string, number>();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      size: 0,
      created: new Date(),
      lastClear: null
    };
    
    // Iniciar limpeza automática de itens expirados
    setInterval(() => this.cleanExpired(), 60000); // A cada minuto
    
    log('Serviço de cache inicializado', 'cache');
  }
  
  /**
   * Obtém um valor do cache
   * @param key Chave para busca
   * @returns O valor se encontrado, ou undefined
   */
  get<T>(key: string): T | undefined {
    // Verificar se a chave existe e não expirou
    if (this.cache.has(key)) {
      const ttl = this.ttls.get(key);
      
      // Se tiver TTL e estiver expirado, remover
      if (ttl !== undefined && ttl < Date.now()) {
        this.delete(key);
        this.stats.misses++;
        return undefined;
      }
      
      this.stats.hits++;
      return this.cache.get(key) as T;
    }
    
    this.stats.misses++;
    return undefined;
  }
  
  /**
   * Armazena um valor no cache
   * @param key Chave para armazenamento
   * @param value Valor a ser armazenado
   * @param ttl Tempo de vida em ms (opcional)
   * @returns true se armazenado com sucesso
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      // Verificar tamanho aproximado do item
      const itemSize = this.estimateSize(key, value);
      
      // Se cache ficará muito grande, limpar alguns itens
      if (this.stats.size + itemSize > this.maxSize) {
        this.evictOldest(Math.max(itemSize, this.maxSize * 0.1)); // Remover pelo menos 10%
      }
      
      // Armazenar o valor e TTL (se especificado)
      this.cache.set(key, value);
      
      if (ttl !== undefined && ttl > 0) {
        this.ttls.set(key, Date.now() + ttl);
      } else {
        this.ttls.delete(key); // Sem TTL (não expira)
      }
      
      // Atualizar estatísticas
      if (!this.cache.has(key)) {
        this.stats.keys++;
      }
      this.stats.size += itemSize;
      
      return true;
    } catch (error) {
      log(`Erro ao armazenar em cache: ${error}`, 'cache', 'error');
      return false;
    }
  }
  
  /**
   * Remove um item do cache
   * @param key Chave a ser removida
   * @returns true se o item existia e foi removido
   */
  delete(key: string): boolean {
    if (this.cache.has(key)) {
      // Estimar tamanho do item a ser removido
      const itemSize = this.estimateSize(key, this.cache.get(key));
      
      // Remover o item e seu TTL
      this.cache.delete(key);
      this.ttls.delete(key);
      
      // Atualizar estatísticas
      this.stats.keys--;
      this.stats.size -= itemSize;
      
      return true;
    }
    return false;
  }
  
  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.ttls.clear();
    
    // Resetar estatísticas
    this.stats.keys = 0;
    this.stats.size = 0;
    this.stats.lastClear = new Date();
    
    log('Cache limpo completamente', 'cache');
  }
  
  /**
   * Obtém as estatísticas do cache
   * @returns Estatísticas atuais
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Remove itens expirados do cache
   * @returns Número de itens removidos
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;
    
    // Verificar todos os TTLs
    for (const [key, expiry] of this.ttls.entries()) {
      if (expiry < now) {
        this.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      log(`Limpeza de cache: ${removed} itens expirados removidos`, 'cache');
    }
    
    return removed;
  }
  
  /**
   * Estima o tamanho em bytes de um item de cache
   * @param key Chave do item
   * @param value Valor do item
   * @returns Tamanho aproximado em bytes
   */
  private estimateSize(key: string, value: any): number {
    let size = 0;
    
    // Estimar tamanho da chave (2 bytes por caractere)
    size += key.length * 2;
    
    // Estimar tamanho do valor
    if (typeof value === 'string') {
      size += value.length * 2;
    } else if (typeof value === 'number') {
      size += 8;
    } else if (typeof value === 'boolean') {
      size += 4;
    } else if (value === null || value === undefined) {
      size += 0;
    } else if (Array.isArray(value)) {
      // Para arrays, estimar tamanho de cada elemento
      size += 8; // Overhead do array
      for (const item of value) {
        size += this.estimateSize('', item);
      }
    } else if (typeof value === 'object') {
      // Para objetos, estimar tamanho de cada propriedade
      size += 8; // Overhead do objeto
      for (const prop in value) {
        if (Object.prototype.hasOwnProperty.call(value, prop)) {
          size += this.estimateSize(prop, value[prop]);
        }
      }
    } else {
      // Outros tipos, usar estimativa conservadora
      size += 32;
    }
    
    return size;
  }
  
  /**
   * Remove os itens mais antigos do cache até liberar o espaço especificado
   * @param bytesToFree Bytes a liberar
   * @returns Número de itens removidos
   */
  private evictOldest(bytesToFree: number): number {
    // Ordenar itens por TTL (mais antigos primeiro)
    // Itens sem TTL são considerados mais recentes
    const now = Date.now();
    const entries = Array.from(this.cache.keys()).map(key => {
      const ttl = this.ttls.get(key) || Number.MAX_SAFE_INTEGER;
      return { key, ttl, age: ttl === Number.MAX_SAFE_INTEGER ? 0 : now - ttl };
    });
    
    // Ordenar por idade (mais antigos primeiro)
    entries.sort((a, b) => b.age - a.age);
    
    let bytesFreed = 0;
    let itemsRemoved = 0;
    
    // Remover itens até liberar espaço suficiente
    for (const entry of entries) {
      if (bytesFreed >= bytesToFree) break;
      
      const item = this.cache.get(entry.key);
      const itemSize = this.estimateSize(entry.key, item);
      
      this.delete(entry.key);
      bytesFreed += itemSize;
      itemsRemoved++;
    }
    
    log(`Limpeza de cache: ${itemsRemoved} itens removidos para liberar ${bytesFreed} bytes`, 'cache');
    return itemsRemoved;
  }
}

// Exportar uma instância única do cache para toda a aplicação
export const cacheService = new MemoryCache();