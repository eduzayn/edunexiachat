/**
 * Configuração de rotas da API
 *
 * Este arquivo define as rotas da API para a aplicação EduChatConnect.
 */
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
/**
 * Configura as rotas de API
 * @param router Router do Express
 * @param storage Interface de armazenamento
 * @returns Router configurado
 */
export function setupRoutes(router, storage) {
    var _this = this;
    // Middleware para verificar autenticação
    var isAuthenticated = function (req, res, next) {
        // Para desenvolvimento, sempre autoriza
        // Em produção, implementar verificação real
        return next();
    };
    // Rota para saúde da API
    router.get('/health', function (req, res) {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Rota para informações de versão
    router.get('/version', function (req, res) {
        res.json({
            name: 'EduChatConnect',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    });
    // Rotas para automações
    router.get('/automations', isAuthenticated, function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var type, automations, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    type = req.query.type;
                    return [4 /*yield*/, storage.getAutomations(type)];
                case 1:
                    automations = _a.sent();
                    res.json(automations);
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    next(error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    router.get('/automations/:id', isAuthenticated, function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var id, automation, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    id = parseInt(req.params.id);
                    return [4 /*yield*/, storage.getAutomationById(id)];
                case 1:
                    automation = _a.sent();
                    if (!automation) {
                        return [2 /*return*/, res.status(404).json({ error: 'Automação não encontrada' })];
                    }
                    res.json(automation);
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    next(error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    router.post('/automations', isAuthenticated, function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var newAutomation, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, storage.createAutomation(req.body)];
                case 1:
                    newAutomation = _a.sent();
                    res.status(201).json(newAutomation);
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    next(error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    router.put('/automations/:id', isAuthenticated, function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var id, updatedAutomation, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    id = parseInt(req.params.id);
                    return [4 /*yield*/, storage.updateAutomation(id, req.body)];
                case 1:
                    updatedAutomation = _a.sent();
                    res.json(updatedAutomation);
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    next(error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    router.delete('/automations/:id', isAuthenticated, function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var id, success, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    id = parseInt(req.params.id);
                    return [4 /*yield*/, storage.deleteAutomation(id)];
                case 1:
                    success = _a.sent();
                    if (!success) {
                        return [2 /*return*/, res.status(404).json({ error: 'Automação não encontrada' })];
                    }
                    res.status(204).end();
                    return [3 /*break*/, 3];
                case 2:
                    error_5 = _a.sent();
                    next(error_5);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    return router;
}
