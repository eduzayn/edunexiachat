var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { db } from "../db";
import { conversations, messages } from "../../shared/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
var anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
/**
 * Sugere respostas para uma mensagem baseada no histórico da conversa
 * e nos pares de perguntas e respostas
 * @param message Mensagem para a qual gerar sugestões
 * @param conversationId ID da conversa
 * @returns Array de sugestões de resposta
 */
export function suggestReply(message, conversationId) {
    return __awaiter(this, void 0, void 0, function () {
        var conversation, recentMessages, conversationHistory, claudeSuggestions, gptSuggestions, allSuggestions, uniqueSuggestions, genericReplies, generic, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, db.select()
                            .from(conversations)
                            .where(eq(conversations.id, conversationId))];
                case 1:
                    conversation = (_a.sent())[0];
                    if (!conversation) {
                        throw new Error("Conversa ID ".concat(conversationId, " n\u00E3o encontrada"));
                    }
                    return [4 /*yield*/, db.select()
                            .from(messages)
                            .where(eq(messages.conversationId, conversationId))
                            .orderBy(db.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " DESC"], ["", " DESC"])), messages.createdAt))
                            .limit(5)];
                case 2:
                    recentMessages = _a.sent();
                    conversationHistory = recentMessages
                        .reverse()
                        .map(function (m) { return "".concat(m.isFromContact ? "Cliente" : "Atendente", ": ").concat(m.content); })
                        .join("\n");
                    return [4 /*yield*/, generateClaudeSuggestions(message, conversationHistory, conversation.channel)];
                case 3:
                    claudeSuggestions = _a.sent();
                    return [4 /*yield*/, generateGPTSuggestions(message, conversationHistory, conversation.channel)];
                case 4:
                    gptSuggestions = _a.sent();
                    allSuggestions = __spreadArray(__spreadArray([], claudeSuggestions, true), gptSuggestions, true);
                    uniqueSuggestions = Array.from(new Set(allSuggestions));
                    // Garantir que temos ao menos 3 sugestões
                    if (uniqueSuggestions.length < 3) {
                        genericReplies = [
                            "Entendi sua solicitação. Vou verificar isso para você e retorno em breve.",
                            "Obrigado pelo contato. Vamos resolver isso o mais rápido possível.",
                            "Agradeço sua paciência. Poderia fornecer mais detalhes para que eu possa ajudar melhor?",
                            "Estamos trabalhando para resolver sua solicitação. Há algo mais que você gostaria de saber?"
                        ];
                        while (uniqueSuggestions.length < 3) {
                            generic = genericReplies[uniqueSuggestions.length % genericReplies.length];
                            if (!uniqueSuggestions.includes(generic)) {
                                uniqueSuggestions.push(generic);
                            }
                        }
                    }
                    return [2 /*return*/, uniqueSuggestions.slice(0, 3)];
                case 5:
                    error_1 = _a.sent();
                    console.error("Erro ao gerar sugestões de resposta:", error_1);
                    // Retornar algumas respostas genéricas em caso de erro
                    return [2 /*return*/, [
                            "Obrigado pelo contato. Como posso ajudar?",
                            "Entendi sua solicitação. Vou verificar isso para você.",
                            "Agradeço sua mensagem. Poderia fornecer mais detalhes?"
                        ]];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gera sugestões usando o modelo Claude da Anthropic
 */
function generateClaudeSuggestions(message, conversationHistory, channel) {
    return __awaiter(this, void 0, void 0, function () {
        var response, content, jsonMatch, suggestions, lines, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, anthropic.messages.create({
                            model: "claude-3-7-sonnet-20250219",
                            max_tokens: 1024,
                            messages: [
                                {
                                    role: "system",
                                    content: "Voc\u00EA \u00E9 um assistente de atendimento ao cliente profissional.\nGere 2 respostas educadas e profissionais para a \u00FAltima mensagem do cliente.\nAs respostas devem ser breves (m\u00E1ximo 2 frases), diretas e se adequar ao canal de comunica\u00E7\u00E3o (".concat(channel, ").\nN\u00E3o inclua n\u00FAmeros ou marcadores nas respostas.\nN\u00E3o repita as mesmas respostas.\nResponda no formato JSON com um array de strings.")
                                },
                                {
                                    role: "user",
                                    content: "Hist\u00F3rico da conversa:\n".concat(conversationHistory, "\n\n\u00DAltima mensagem do cliente: ").concat(message, "\n\nGere 2 respostas adequadas.")
                                }
                            ],
                        })];
                case 1:
                    response = _a.sent();
                    // Extrair as sugestões do JSON
                    try {
                        content = response.content[0].text;
                        jsonMatch = content.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            suggestions = JSON.parse(jsonMatch[0]);
                            if (Array.isArray(suggestions)) {
                                return [2 /*return*/, suggestions];
                            }
                        }
                        // Fallback para processamento simples do texto
                        return [2 /*return*/, content
                                .replace(/["'\[\]{}]/g, '')
                                .split(/\n|,/)
                                .map(function (s) { return s.trim(); })
                                .filter(function (s) { return s.length > 0 && !s.startsWith('1.') && !s.startsWith('2.'); })];
                    }
                    catch (err) {
                        console.error("Erro ao processar JSON de sugestões Claude:", err);
                        lines = response.content[0].text
                            .split('\n')
                            .map(function (line) { return line.trim(); })
                            .filter(function (line) { return line.length > 10 && !line.includes('"') && !line.includes('[') && !line.includes(']'); });
                        return [2 /*return*/, lines.slice(0, 2)];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error("Erro ao gerar sugestões com Claude:", error_2);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gera sugestões usando o modelo GPT-4 da OpenAI
 */
function generateGPTSuggestions(message, conversationHistory, channel) {
    return __awaiter(this, void 0, void 0, function () {
        var response, content, parsed, key, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: [
                                {
                                    role: "system",
                                    content: "Voc\u00EA \u00E9 um assistente de atendimento ao cliente profissional.\nGere 2 respostas educadas e profissionais para a \u00FAltima mensagem do cliente.\nAs respostas devem ser breves (m\u00E1ximo 2 frases), diretas e se adequar ao canal de comunica\u00E7\u00E3o (".concat(channel, ").\nResponda apenas com as sugest\u00F5es em formato JSON, um array de strings.")
                                },
                                {
                                    role: "user",
                                    content: "Hist\u00F3rico da conversa:\n".concat(conversationHistory, "\n\n\u00DAltima mensagem do cliente: ").concat(message, "\n\nGere 2 respostas adequadas.")
                                }
                            ],
                            response_format: { type: "json_object" }
                        })];
                case 1:
                    response = _a.sent();
                    // Extrair as sugestões do JSON
                    try {
                        content = response.choices[0].message.content;
                        if (!content)
                            return [2 /*return*/, []];
                        parsed = JSON.parse(content);
                        if (Array.isArray(parsed.suggestions)) {
                            return [2 /*return*/, parsed.suggestions];
                        }
                        else if (Array.isArray(parsed.responses)) {
                            return [2 /*return*/, parsed.responses];
                        }
                        else if (Array.isArray(parsed.replies)) {
                            return [2 /*return*/, parsed.replies];
                        }
                        else {
                            // Tenta encontrar qualquer array no objeto
                            for (key in parsed) {
                                if (Array.isArray(parsed[key])) {
                                    return [2 /*return*/, parsed[key]];
                                }
                            }
                        }
                        return [2 /*return*/, []];
                    }
                    catch (err) {
                        console.error("Erro ao processar JSON de sugestões GPT:", err);
                        return [2 /*return*/, []];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error("Erro ao gerar sugestões com GPT:", error_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var templateObject_1;
