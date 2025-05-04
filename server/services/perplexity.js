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
import axios from 'axios';
import { log } from '../utils/logger';
var API_URL = 'https://api.perplexity.ai/chat/completions';
var DEFAULT_MODEL = 'llama-3.1-sonar-small-128k-online';
/**
 * Verifica se a API da Perplexity está configurada
 * @returns Promise<boolean> Verdadeiro se a API estiver configurada
 */
export function isPerplexityConfigured() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, !!process.env.PERPLEXITY_API_KEY];
        });
    });
}
export function generatePerplexityResponse(input_1) {
    return __awaiter(this, arguments, void 0, function (input, config) {
        var model, temperature, maxTokens, topP, systemPrompt, useSearch, searchRecency, response, responseText, result, error_1, errorMessage;
        var _a;
        if (config === void 0) { config = {}; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    if (!process.env.PERPLEXITY_API_KEY) {
                        throw new Error("PERPLEXITY_API_KEY não está configurada");
                    }
                    model = config.model || DEFAULT_MODEL;
                    temperature = config.temperature !== undefined ? config.temperature : 0.7;
                    maxTokens = config.maxTokens || 1024;
                    topP = config.topP !== undefined ? config.topP : 0.9;
                    systemPrompt = config.instructions || "Você é um assistente útil e amigável.";
                    useSearch = (_a = config.useSearch) !== null && _a !== void 0 ? _a : false;
                    searchRecency = config.searchRecency || "month";
                    log("Enviando solicita\u00E7\u00E3o para Perplexity (".concat(model, ")"), "perplexity");
                    return [4 /*yield*/, axios.post(API_URL, {
                            model: model,
                            messages: [
                                {
                                    role: "system",
                                    content: systemPrompt
                                },
                                {
                                    role: "user",
                                    content: input
                                }
                            ],
                            temperature: temperature,
                            max_tokens: maxTokens,
                            top_p: topP,
                            search_recency_filter: useSearch ? searchRecency : undefined,
                            stream: false
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(process.env.PERPLEXITY_API_KEY)
                            }
                        })];
                case 1:
                    response = _b.sent();
                    if (response.data && response.data.choices && response.data.choices.length > 0) {
                        responseText = response.data.choices[0].message.content;
                        log("Resposta recebida da Perplexity (".concat(responseText.length, " caracteres)"), "perplexity");
                        result = { text: responseText };
                        // Se houver citações e o usuário habilitou a busca, incluí-las no resultado
                        if (useSearch && response.data.citations && response.data.citations.length > 0) {
                            result.citations = response.data.citations;
                        }
                        return [2 /*return*/, result];
                    }
                    else {
                        throw new Error("Resposta vazia recebida da Perplexity");
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    log("Erro ao gerar resposta com Perplexity: ".concat(errorMessage), "perplexity");
                    throw new Error("Falha ao gerar resposta com Perplexity: ".concat(errorMessage));
                case 3: return [2 /*return*/];
            }
        });
    });
}
