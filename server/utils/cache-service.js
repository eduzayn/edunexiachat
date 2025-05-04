/**
 * Serviço de cache para a aplicação
 *
 * Este arquivo fornece um serviço de cache para armazenar dados em memória
 * que são frequentemente acessados, reduzindo a carga no banco de dados.
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
import { log } from './logger';
/**
 * Implementação básica de cache em memória
 */
var MemoryCache = /** @class */ (function () {
    /**
     * Cria uma nova instância do cache
     * @param maxSize Tamanho máximo do cache em bytes (aproximado)
     */
    function MemoryCache(maxSize) {
        if (maxSize === void 0) { maxSize = 50 * 1024 * 1024; }
        var _this = this;
        this.cache = new Map();
        this.ttls = new Map();
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
        setInterval(function () { return _this.cleanExpired(); }, 60000); // A cada minuto
        log('Serviço de cache inicializado', 'cache');
    }
    /**
     * Obtém um valor do cache
     * @param key Chave para busca
     * @returns O valor se encontrado, ou undefined
     */
    MemoryCache.prototype.get = function (key) {
        // Verificar se a chave existe e não expirou
        if (this.cache.has(key)) {
            var ttl = this.ttls.get(key);
            // Se tiver TTL e estiver expirado, remover
            if (ttl !== undefined && ttl < Date.now()) {
                this.delete(key);
                this.stats.misses++;
                return undefined;
            }
            this.stats.hits++;
            return this.cache.get(key);
        }
        this.stats.misses++;
        return undefined;
    };
    /**
     * Armazena um valor no cache
     * @param key Chave para armazenamento
     * @param value Valor a ser armazenado
     * @param ttl Tempo de vida em ms (opcional)
     * @returns true se armazenado com sucesso
     */
    MemoryCache.prototype.set = function (key, value, ttl) {
        try {
            // Verificar tamanho aproximado do item
            var itemSize = this.estimateSize(key, value);
            // Se cache ficará muito grande, limpar alguns itens
            if (this.stats.size + itemSize > this.maxSize) {
                this.evictOldest(Math.max(itemSize, this.maxSize * 0.1)); // Remover pelo menos 10%
            }
            // Armazenar o valor e TTL (se especificado)
            this.cache.set(key, value);
            if (ttl !== undefined && ttl > 0) {
                this.ttls.set(key, Date.now() + ttl);
            }
            else {
                this.ttls.delete(key); // Sem TTL (não expira)
            }
            // Atualizar estatísticas
            if (!this.cache.has(key)) {
                this.stats.keys++;
            }
            this.stats.size += itemSize;
            return true;
        }
        catch (error) {
            log("Erro ao armazenar em cache: ".concat(error), 'cache', 'error');
            return false;
        }
    };
    /**
     * Remove um item do cache
     * @param key Chave a ser removida
     * @returns true se o item existia e foi removido
     */
    MemoryCache.prototype.delete = function (key) {
        if (this.cache.has(key)) {
            // Estimar tamanho do item a ser removido
            var itemSize = this.estimateSize(key, this.cache.get(key));
            // Remover o item e seu TTL
            this.cache.delete(key);
            this.ttls.delete(key);
            // Atualizar estatísticas
            this.stats.keys--;
            this.stats.size -= itemSize;
            return true;
        }
        return false;
    };
    /**
     * Limpa todo o cache
     */
    MemoryCache.prototype.clear = function () {
        this.cache.clear();
        this.ttls.clear();
        // Resetar estatísticas
        this.stats.keys = 0;
        this.stats.size = 0;
        this.stats.lastClear = new Date();
        log('Cache limpo completamente', 'cache');
    };
    /**
     * Obtém as estatísticas do cache
     * @returns Estatísticas atuais
     */
    MemoryCache.prototype.getStats = function () {
        return __assign({}, this.stats);
    };
    /**
     * Remove itens expirados do cache
     * @returns Número de itens removidos
     */
    MemoryCache.prototype.cleanExpired = function () {
        var now = Date.now();
        var removed = 0;
        // Verificar todos os TTLs
        for (var _i = 0, _a = this.ttls.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], expiry = _b[1];
            if (expiry < now) {
                this.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            log("Limpeza de cache: ".concat(removed, " itens expirados removidos"), 'cache');
        }
        return removed;
    };
    /**
     * Estima o tamanho em bytes de um item de cache
     * @param key Chave do item
     * @param value Valor do item
     * @returns Tamanho aproximado em bytes
     */
    MemoryCache.prototype.estimateSize = function (key, value) {
        var size = 0;
        // Estimar tamanho da chave (2 bytes por caractere)
        size += key.length * 2;
        // Estimar tamanho do valor
        if (typeof value === 'string') {
            size += value.length * 2;
        }
        else if (typeof value === 'number') {
            size += 8;
        }
        else if (typeof value === 'boolean') {
            size += 4;
        }
        else if (value === null || value === undefined) {
            size += 0;
        }
        else if (Array.isArray(value)) {
            // Para arrays, estimar tamanho de cada elemento
            size += 8; // Overhead do array
            for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                var item = value_1[_i];
                size += this.estimateSize('', item);
            }
        }
        else if (typeof value === 'object') {
            // Para objetos, estimar tamanho de cada propriedade
            size += 8; // Overhead do objeto
            for (var prop in value) {
                if (Object.prototype.hasOwnProperty.call(value, prop)) {
                    size += this.estimateSize(prop, value[prop]);
                }
            }
        }
        else {
            // Outros tipos, usar estimativa conservadora
            size += 32;
        }
        return size;
    };
    /**
     * Remove os itens mais antigos do cache até liberar o espaço especificado
     * @param bytesToFree Bytes a liberar
     * @returns Número de itens removidos
     */
    MemoryCache.prototype.evictOldest = function (bytesToFree) {
        var _this = this;
        // Ordenar itens por TTL (mais antigos primeiro)
        // Itens sem TTL são considerados mais recentes
        var now = Date.now();
        var entries = Array.from(this.cache.keys()).map(function (key) {
            var ttl = _this.ttls.get(key) || Number.MAX_SAFE_INTEGER;
            return { key: key, ttl: ttl, age: ttl === Number.MAX_SAFE_INTEGER ? 0 : now - ttl };
        });
        // Ordenar por idade (mais antigos primeiro)
        entries.sort(function (a, b) { return b.age - a.age; });
        var bytesFreed = 0;
        var itemsRemoved = 0;
        // Remover itens até liberar espaço suficiente
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            if (bytesFreed >= bytesToFree)
                break;
            var item = this.cache.get(entry.key);
            var itemSize = this.estimateSize(entry.key, item);
            this.delete(entry.key);
            bytesFreed += itemSize;
            itemsRemoved++;
        }
        log("Limpeza de cache: ".concat(itemsRemoved, " itens removidos para liberar ").concat(bytesFreed, " bytes"), 'cache');
        return itemsRemoved;
    };
    return MemoryCache;
}());
// Exportar uma instância única do cache para toda a aplicação
export var cacheService = new MemoryCache();
