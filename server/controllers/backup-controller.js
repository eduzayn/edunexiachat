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
import { backupService } from '../utils/backup-service';
import { log } from '../utils/logger';
/**
 * Controlador para gerenciar backups do sistema
 */
var BackupController = /** @class */ (function () {
    function BackupController() {
    }
    /**
     * Obtém a lista de backups disponíveis
     */
    BackupController.getBackups = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var backups, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, backupService.getBackups()];
                    case 1:
                        backups = _a.sent();
                        res.json({ backups: backups });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        log("Erro ao listar backups: ".concat(error_1), 'controller', 'error');
                        res.status(500).json({ error: 'Erro ao listar backups', message: String(error_1) });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Inicia um backup manual
     */
    BackupController.createBackup = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, name_1, metadata, backup, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = req.body, name_1 = _a.name, metadata = _a.metadata;
                        // Validações básicas
                        if (name_1 && typeof name_1 !== 'string') {
                            return [2 /*return*/, res.status(400).json({ error: 'Nome do backup deve ser uma string' })];
                        }
                        return [4 /*yield*/, backupService.createBackup(name_1, metadata)];
                    case 1:
                        backup = _b.sent();
                        res.json({
                            message: 'Backup iniciado com sucesso',
                            backup: backup
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        log("Erro ao criar backup: ".concat(error_2), 'controller', 'error');
                        res.status(500).json({ error: 'Erro ao criar backup', message: String(error_2) });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Restaura um backup a partir do ID
     */
    BackupController.restoreBackup = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var id_1, backups, backupExists, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        id_1 = req.params.id;
                        if (!id_1) {
                            return [2 /*return*/, res.status(400).json({ error: 'ID do backup é obrigatório' })];
                        }
                        return [4 /*yield*/, backupService.getBackups()];
                    case 1:
                        backups = _a.sent();
                        backupExists = backups.some(function (backup) { return backup.id === id_1; });
                        if (!backupExists) {
                            return [2 /*return*/, res.status(404).json({ error: 'Backup não encontrado' })];
                        }
                        // Iniciar restauração
                        return [4 /*yield*/, backupService.restoreBackup(id_1)];
                    case 2:
                        // Iniciar restauração
                        _a.sent();
                        res.json({
                            message: 'Backup restaurado com sucesso'
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        log("Erro ao restaurar backup: ".concat(error_3), 'controller', 'error');
                        res.status(500).json({ error: 'Erro ao restaurar backup', message: String(error_3) });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verifica o status atual do sistema de backup
     */
    BackupController.getBackupStatus = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var status_1;
            return __generator(this, function (_a) {
                try {
                    status_1 = backupService.getStatus();
                    res.json({ status: status_1 });
                }
                catch (error) {
                    log("Erro ao obter status de backup: ".concat(error), 'controller', 'error');
                    res.status(500).json({ error: 'Erro ao obter status de backup', message: String(error) });
                }
                return [2 /*return*/];
            });
        });
    };
    return BackupController;
}());
export default BackupController;
