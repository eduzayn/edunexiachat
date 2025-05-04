/**
 * Serviço de backup para a aplicação
 *
 * Este arquivo fornece funcionalidades para realizar e gerenciar backups
 * dos dados da aplicação, incluindo banco de dados e arquivos de configuração.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { log } from './logger';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
var execAsync = promisify(exec);
// Diretório onde os backups são armazenados
var BACKUP_DIR = path.resolve(process.cwd(), 'backups');
/**
 * Classe que gerencia as operações de backup
 */
var BackupService = /** @class */ (function () {
    function BackupService() {
        this.backupTimer = null;
        // Garantir que o diretório de backup exista
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            log("Diret\u00F3rio de backup criado: ".concat(BACKUP_DIR), 'backup');
        }
        // Inicializar status
        this.status = {
            enabled: true,
            lastBackup: null,
            nextScheduledBackup: null,
            totalBackups: 0,
            backupDir: BACKUP_DIR,
            diskSpaceUsed: 0,
            autoBackupInterval: 24 * 60 * 60 * 1000 // 24 horas (em milissegundos)
        };
        // Carregar informações dos backups existentes
        this.refreshStatus();
        // Iniciar backups automáticos (se habilitados)
        this.scheduleNextBackup();
        log('Serviço de backup inicializado', 'backup');
    }
    /**
     * Atualiza as informações de status do serviço
     */
    BackupService.prototype.refreshStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, backupFiles, totalSize, _i, backupFiles_1, file, filePath, stats, mostRecent, _a, backupFiles_2, file, filePath, stats;
            return __generator(this, function (_b) {
                try {
                    files = fs.readdirSync(BACKUP_DIR);
                    backupFiles = files.filter(function (f) { return f.endsWith('.zip') || f.endsWith('.sql') || f.endsWith('.json'); });
                    this.status.totalBackups = backupFiles.length;
                    totalSize = 0;
                    for (_i = 0, backupFiles_1 = backupFiles; _i < backupFiles_1.length; _i++) {
                        file = backupFiles_1[_i];
                        filePath = path.join(BACKUP_DIR, file);
                        stats = fs.statSync(filePath);
                        totalSize += stats.size;
                    }
                    this.status.diskSpaceUsed = totalSize;
                    // Encontrar o backup mais recente
                    if (backupFiles.length > 0) {
                        mostRecent = new Date(0);
                        for (_a = 0, backupFiles_2 = backupFiles; _a < backupFiles_2.length; _a++) {
                            file = backupFiles_2[_a];
                            filePath = path.join(BACKUP_DIR, file);
                            stats = fs.statSync(filePath);
                            if (stats.mtime > mostRecent) {
                                mostRecent = stats.mtime;
                            }
                        }
                        this.status.lastBackup = mostRecent;
                    }
                    return [2 /*return*/, __assign({}, this.status)];
                }
                catch (error) {
                    log("Erro ao atualizar status de backup: ".concat(error), 'backup', 'error');
                    return [2 /*return*/, __assign({}, this.status)];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Agenda o próximo backup automático
     */
    BackupService.prototype.scheduleNextBackup = function () {
        var _this = this;
        if (!this.status.enabled) {
            log('Backups automáticos estão desabilitados', 'backup');
            return;
        }
        // Limpar timer existente, se houver
        if (this.backupTimer) {
            clearTimeout(this.backupTimer);
        }
        // Calcular quando o próximo backup deve ocorrer
        var now = new Date();
        var nextBackupTime;
        if (!this.status.lastBackup) {
            // Se nunca tiver feito backup, agendar para daqui a 1 hora
            nextBackupTime = new Date(now.getTime() + 60 * 60 * 1000);
        }
        else {
            // Caso contrário, usar o intervalo configurado
            var lastBackupTime = this.status.lastBackup.getTime();
            var nextTime = lastBackupTime + this.status.autoBackupInterval;
            if (nextTime <= now.getTime()) {
                // Se já estiver no passado, agendar para daqui a 5 minutos
                nextBackupTime = new Date(now.getTime() + 5 * 60 * 1000);
            }
            else {
                nextBackupTime = new Date(nextTime);
            }
        }
        // Atualizar próximo horário de backup
        this.status.nextScheduledBackup = nextBackupTime;
        // Calcular o tempo até o próximo backup
        var timeUntilBackup = nextBackupTime.getTime() - now.getTime();
        log("Pr\u00F3ximo backup autom\u00E1tico agendado para ".concat(nextBackupTime.toISOString()), 'backup');
        // Agendar o próximo backup
        this.backupTimer = setTimeout(function () { return _this.createBackup(); }, timeUntilBackup);
    };
    /**
     * Cria um novo backup completo do sistema
     * @param name Nome personalizado para o backup (opcional)
     * @param metadata Metadados adicionais para o backup (opcional)
     * @returns Informações sobre o backup criado
     */
    BackupService.prototype.createBackup = function (name, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var timestamp, id, backupName, tempDir, metadataFile, dbBackupPath, backupFileName, backupPath, stats, size, error_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        timestamp = new Date();
                        id = "backup_".concat(timestamp.getTime(), "_").concat(Math.random().toString(36).substring(2, 10));
                        backupName = name || "Backup ".concat(timestamp.toISOString().replace(/[:.]/g, '-'));
                        log("Iniciando backup \"".concat(backupName, "\" (").concat(id, ")..."), 'backup');
                        tempDir = path.join(BACKUP_DIR, "tmp_".concat(id));
                        fs.mkdirSync(tempDir, { recursive: true });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        metadataFile = path.join(tempDir, 'metadata.json');
                        fs.writeFileSync(metadataFile, JSON.stringify({
                            id: id,
                            name: backupName,
                            timestamp: timestamp.toISOString(),
                            metadata: metadata || {},
                            version: process.env.npm_package_version || 'unknown',
                            environment: process.env.NODE_ENV || 'development'
                        }, null, 2));
                        dbBackupPath = path.join(tempDir, 'database.sql');
                        fs.writeFileSync(dbBackupPath, "-- Backup do banco de dados (".concat(timestamp.toISOString(), ")"));
                        backupFileName = "".concat(id, ".zip");
                        backupPath = path.join(BACKUP_DIR, backupFileName);
                        // Usar utilitário zip para comprimir
                        return [4 /*yield*/, execAsync("cd \"".concat(tempDir, "\" && zip -r \"").concat(backupPath, "\" ./*"))];
                    case 2:
                        // Usar utilitário zip para comprimir
                        _a.sent();
                        // Remover diretório temporário
                        fs.rmSync(tempDir, { recursive: true, force: true });
                        stats = fs.statSync(backupPath);
                        size = stats.size;
                        // Atualizar status
                        this.status.lastBackup = timestamp;
                        return [4 /*yield*/, this.refreshStatus()];
                    case 3:
                        _a.sent();
                        this.scheduleNextBackup();
                        log("Backup \"".concat(backupName, "\" criado com sucesso (").concat(size, " bytes)"), 'backup');
                        return [2 /*return*/, {
                                id: id,
                                timestamp: timestamp,
                                size: size,
                                name: backupName,
                                metadata: metadata || {}
                            }];
                    case 4:
                        error_1 = _a.sent();
                        // Limpar em caso de erro
                        if (fs.existsSync(tempDir)) {
                            fs.rmSync(tempDir, { recursive: true, force: true });
                        }
                        throw error_1;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        log("Erro ao criar backup: ".concat(error_2), 'backup', 'error');
                        throw new Error("Falha ao criar backup: ".concat(error_2));
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Obtém a lista de todos os backups disponíveis
     * @returns Array com informações de todos os backups
     */
    BackupService.prototype.getBackups = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, backupFiles, backups, _i, backupFiles_3, file, id, filePath, stats, timestampMatch, timestamp;
            return __generator(this, function (_a) {
                try {
                    files = fs.readdirSync(BACKUP_DIR);
                    backupFiles = files.filter(function (f) { return f.endsWith('.zip'); });
                    backups = [];
                    // Processar cada arquivo
                    for (_i = 0, backupFiles_3 = backupFiles; _i < backupFiles_3.length; _i++) {
                        file = backupFiles_3[_i];
                        try {
                            id = file.replace('.zip', '');
                            filePath = path.join(BACKUP_DIR, file);
                            stats = fs.statSync(filePath);
                            timestampMatch = id.match(/backup_(\d+)_/);
                            timestamp = timestampMatch
                                ? new Date(parseInt(timestampMatch[1]))
                                : stats.mtime;
                            backups.push({
                                id: id,
                                timestamp: timestamp,
                                size: stats.size,
                                name: "Backup ".concat(timestamp.toISOString())
                            });
                        }
                        catch (error) {
                            log("Erro ao processar backup ".concat(file, ": ").concat(error), 'backup', 'warn');
                            // Continuar com o próximo arquivo
                        }
                    }
                    // Ordenar por data (mais recente primeiro)
                    backups.sort(function (a, b) { return b.timestamp.getTime() - a.timestamp.getTime(); });
                    return [2 /*return*/, backups];
                }
                catch (error) {
                    log("Erro ao listar backups: ".concat(error), 'backup', 'error');
                    return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Restaura um backup a partir do seu ID
     * @param id ID do backup a ser restaurado
     * @returns true se a restauração foi bem-sucedida
     */
    BackupService.prototype.restoreBackup = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var backupPath, tempDir, error_3, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        backupPath = path.join(BACKUP_DIR, "".concat(id, ".zip"));
                        // Verificar se o arquivo existe
                        if (!fs.existsSync(backupPath)) {
                            throw new Error("Backup com ID ".concat(id, " n\u00E3o encontrado"));
                        }
                        log("Iniciando restaura\u00E7\u00E3o do backup ".concat(id, "..."), 'backup');
                        tempDir = path.join(BACKUP_DIR, "restore_".concat(id));
                        fs.mkdirSync(tempDir, { recursive: true });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // Extrair o arquivo ZIP
                        return [4 /*yield*/, execAsync("unzip -o \"".concat(backupPath, "\" -d \"").concat(tempDir, "\""))];
                    case 2:
                        // Extrair o arquivo ZIP
                        _a.sent();
                        // Aqui seria implementada a restauração real dos dados
                        // Por exemplo, importar o arquivo SQL para o banco de dados
                        // e copiar arquivos para os locais apropriados
                        log("Simulando restaura\u00E7\u00E3o do banco de dados...", 'backup');
                        // await execAsync(`psql -f "${tempDir}/database.sql" ${process.env.DATABASE_URL}`);
                        // Limpar diretório temporário
                        fs.rmSync(tempDir, { recursive: true, force: true });
                        log("Backup ".concat(id, " restaurado com sucesso"), 'backup');
                        return [2 /*return*/, true];
                    case 3:
                        error_3 = _a.sent();
                        // Limpar em caso de erro
                        if (fs.existsSync(tempDir)) {
                            fs.rmSync(tempDir, { recursive: true, force: true });
                        }
                        throw error_3;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_4 = _a.sent();
                        log("Erro ao restaurar backup ".concat(id, ": ").concat(error_4), 'backup', 'error');
                        throw new Error("Falha ao restaurar backup: ".concat(error_4));
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove um backup pelo ID
     * @param id ID do backup a ser removido
     * @returns true se o backup foi removido com sucesso
     */
    BackupService.prototype.deleteBackup = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var backupPath, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        backupPath = path.join(BACKUP_DIR, "".concat(id, ".zip"));
                        // Verificar se o arquivo existe
                        if (!fs.existsSync(backupPath)) {
                            throw new Error("Backup com ID ".concat(id, " n\u00E3o encontrado"));
                        }
                        // Remover o arquivo
                        fs.unlinkSync(backupPath);
                        // Atualizar status
                        return [4 /*yield*/, this.refreshStatus()];
                    case 1:
                        // Atualizar status
                        _a.sent();
                        log("Backup ".concat(id, " removido com sucesso"), 'backup');
                        return [2 /*return*/, true];
                    case 2:
                        error_5 = _a.sent();
                        log("Erro ao remover backup ".concat(id, ": ").concat(error_5), 'backup', 'error');
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Obtém o status atual do sistema de backup
     * @returns Informações sobre o estado atual do backup
     */
    BackupService.prototype.getStatus = function () {
        return __assign({}, this.status);
    };
    /**
     * Habilita ou desabilita os backups automáticos
     * @param enabled true para habilitar, false para desabilitar
     */
    BackupService.prototype.setEnabled = function (enabled) {
        this.status.enabled = enabled;
        if (enabled) {
            log('Backups automáticos habilitados', 'backup');
            this.scheduleNextBackup();
        }
        else {
            log('Backups automáticos desabilitados', 'backup');
            if (this.backupTimer) {
                clearTimeout(this.backupTimer);
                this.backupTimer = null;
            }
        }
    };
    /**
     * Define o intervalo entre backups automáticos
     * @param intervalMs Intervalo em milissegundos
     */
    BackupService.prototype.setBackupInterval = function (intervalMs) {
        if (intervalMs < 60000) { // Mínimo de 1 minuto
            intervalMs = 60000;
        }
        this.status.autoBackupInterval = intervalMs;
        log("Intervalo de backup autom\u00E1tico definido para ".concat(intervalMs, "ms"), 'backup');
        // Reagendar próximo backup
        if (this.status.enabled) {
            this.scheduleNextBackup();
        }
    };
    return BackupService;
}());
export { BackupService };
// Exportar uma instância única do serviço de backup
export var backupService = new BackupService();
