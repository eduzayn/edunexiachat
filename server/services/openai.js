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
import OpenAI from "openai";
import { log } from '../utils/logger';
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
var DEFAULT_MODEL = "gpt-4o";
/**
 * Verifica se a API da OpenAI está configurada
 * @returns Promise<boolean> Verdadeiro se a API estiver configurada
 */
export function isOpenAIConfigured() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, !!process.env.OPENAI_API_KEY];
        });
    });
}
/**
 * Cliente da API da OpenAI
 * @returns OpenAI cliente inicializado se a API estiver configurada, ou null caso contrário
 */
export function getOpenAIClient() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            log("OPENAI_API_KEY não configurada", "openai");
            return null;
        }
        return new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    catch (error) {
        log("Erro ao criar cliente OpenAI: ".concat(error), "openai");
        return null;
    }
}
/**
 * Gera uma resposta usando a API da OpenAI
 * @param input Texto de entrada para o modelo
 * @param config Configurações do modelo
 * @returns Promise<string> Texto da resposta gerada
 */
export function generateOpenAIResponse(input_1) {
    return __awaiter(this, arguments, void 0, function (input, config) {
        var client, model, maxTokens, temperature, topP, frequencyPenalty, presencePenalty, systemPrompt, response, responseText, error_1, errorMessage;
        if (config === void 0) { config = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    client = getOpenAIClient();
                    if (!client) {
                        throw new Error("Cliente OpenAI não está disponível");
                    }
                    model = config.model || DEFAULT_MODEL;
                    maxTokens = config.maxTokens || 1024;
                    temperature = config.temperature !== undefined ? config.temperature : 0.7;
                    topP = config.topP !== undefined ? config.topP : 1;
                    frequencyPenalty = config.frequencyPenalty || 0;
                    presencePenalty = config.presencePenalty || 0;
                    systemPrompt = config.instructions || "Você é um assistente útil e amigável.";
                    log("Enviando solicita\u00E7\u00E3o para OpenAI (".concat(model, ")"), "openai");
                    return [4 /*yield*/, client.chat.completions.create({
                            model: model,
                            temperature: temperature,
                            max_tokens: maxTokens,
                            top_p: topP,
                            frequency_penalty: frequencyPenalty,
                            presence_penalty: presencePenalty,
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: input }
                            ],
                        })];
                case 1:
                    response = _a.sent();
                    // Extrair o texto da resposta
                    if (response.choices && response.choices.length > 0 && response.choices[0].message.content) {
                        responseText = response.choices[0].message.content;
                        log("Resposta recebida da OpenAI (".concat(responseText.length, " caracteres)"), "openai");
                        return [2 /*return*/, responseText];
                    }
                    else {
                        throw new Error("Resposta vazia recebida da OpenAI");
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    log("Erro ao gerar resposta com OpenAI: ".concat(errorMessage), "openai");
                    throw new Error("Falha ao gerar resposta com OpenAI: ".concat(errorMessage));
                case 3: return [2 /*return*/];
            }
        });
    });
}
