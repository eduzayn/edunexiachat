/**
 * Configuração e conexão com banco de dados PostgreSQL
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
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import createLogger from "./utils/logger";
var logger = createLogger("database");
// Obter URL de conexão da variável de ambiente
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    logger.error("DATABASE_URL não configurada");
    throw new Error("Variável de ambiente DATABASE_URL não configurada");
}
// Configuração do pool de conexões
var pool = new Pool({
    connectionString: connectionString,
    max: 10, // Máximo de conexões no pool
    idleTimeoutMillis: 30000, // Tempo máximo de inatividade
    connectionTimeoutMillis: 5000, // Tempo máximo para conexão
});
// Eventos do pool
pool.on("connect", function () {
    logger.debug("Nova conexão ao banco de dados estabelecida");
});
pool.on("error", function (err) {
    logger.error("Erro no pool de conexão PostgreSQL", { error: err });
});
// Inicialização do Drizzle ORM
export var db = drizzle(pool, { schema: schema });
// Função para teste de conexão
export function testDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var client, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, client.query("SELECT 1")];
                case 3:
                    _a.sent();
                    logger.info("Conexão com banco de dados testada com sucesso");
                    return [2 /*return*/, true];
                case 4:
                    client.release();
                    return [7 /*endfinally*/];
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    logger.error("Falha ao testar conexão com banco de dados", { error: error_1 });
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Função para encerramento limpo da conexão
export function closeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, pool.end()];
                case 1:
                    _a.sent();
                    logger.info("Conexão com banco de dados encerrada");
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    logger.error("Erro ao encerrar conexão com banco de dados", { error: error_2 });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
