/**
 * Executa ações de automação com base em tipos e contexto
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import lodash from 'lodash';
import { AiService } from '../ai/index';
var get = lodash.get, merge = lodash.merge;
/**
 * Classe para execução de automações
 */
var AutomationExecutor = /** @class */ (function () {
    function AutomationExecutor(storage, templater) {
        this.storage = storage;
        this.templater = templater;
    }
    /**
     * Executa uma automação
     * @param automation Automação a ser executada
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    AutomationExecutor.prototype.execute = function (automation, context) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Atualizar data da última execução
                        return [4 /*yield*/, this.storage.updateAutomation(automation.id, {
                                lastExecutedAt: new Date()
                            })];
                    case 1:
                        // Atualizar data da última execução
                        _a.sent();
                        // Escolher método de execução com base no tipo
                        switch (automation.type) {
                            case 'quick_reply':
                                return [2 /*return*/, this.executeQuickReply(automation, context)];
                            case 'chatbot':
                                return [2 /*return*/, this.executeChatbot(automation, context)];
                            case 'trigger':
                                return [2 /*return*/, this.executeTrigger(automation, context)];
                            case 'scheduled':
                                return [2 /*return*/, this.executeScheduled(automation, context)];
                            default:
                                throw new Error("Tipo de automa\u00E7\u00E3o desconhecido: ".concat(automation.type));
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Erro ao executar automa\u00E7\u00E3o ".concat(automation.id, ":"), error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message || 'Erro desconhecido durante execução da automação',
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executa automação de resposta rápida
     * @param automation Automação de resposta rápida
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    AutomationExecutor.prototype.executeQuickReply = function (automation, context) {
        return __awaiter(this, void 0, void 0, function () {
            var incomingContent_1, triggerConfig, keywords, matchFound, responseTemplate, processedResponse, message, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        // Verificar se há mensagem de entrada e conversa
                        if (!context.incomingMessage || !context.conversation) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Contexto incompleto: mensagem ou conversa ausente',
                                }];
                        }
                        incomingContent_1 = context.incomingMessage.content.toLowerCase();
                        triggerConfig = (automation.trigger || {});
                        keywords = triggerConfig.keywords || [];
                        // Se não houver palavras-chave definidas, não executar
                        if (!keywords.length) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Nenhuma palavra-chave definida para resposta rápida',
                                }];
                        }
                        matchFound = keywords.some(function (keyword) {
                            return incomingContent_1.includes(keyword.toLowerCase());
                        });
                        if (!matchFound) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Nenhuma correspondência encontrada para as palavras-chave',
                                }];
                        }
                        responseTemplate = automation.response || '';
                        processedResponse = this.templater.processTemplate(responseTemplate, context);
                        return [4 /*yield*/, this.storage.createMessage({
                                conversationId: context.conversation.id,
                                content: processedResponse,
                                contentType: 'text',
                                direction: 'outbound',
                                status: 'sent',
                                sentById: null, // Sistema
                            })];
                    case 1:
                        message = _a.sent();
                        if (!context.channel) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.sendMessageViaChannel(context.channel, context.conversation.contactIdentifier, processedResponse)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, {
                            success: true,
                            response: processedResponse,
                            message: message,
                        }];
                    case 4:
                        error_2 = _a.sent();
                        console.error('Erro ao executar resposta rápida:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2.message || 'Erro desconhecido ao executar resposta rápida',
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executa automação de chatbot com IA
     * @param automation Automação de chatbot
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    AutomationExecutor.prototype.executeChatbot = function (automation, context) {
        return __awaiter(this, void 0, void 0, function () {
            var modelProvider, modelConfig, recentMessages, systemPrompt, formattedSystemPrompt, fullPrompt_1, aiResponseText, aiService, error_3, processedResponse, message, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        // Verificar se há mensagem de entrada e conversa
                        if (!context.incomingMessage || !context.conversation) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Contexto incompleto: mensagem ou conversa ausente',
                                }];
                        }
                        modelProvider = automation.modelProvider || 'openai';
                        modelConfig = (automation.modelConfig || {});
                        recentMessages = context.messages || [];
                        systemPrompt = get(automation, 'response.prompt', '');
                        formattedSystemPrompt = this.templater.processTemplate(systemPrompt, context);
                        fullPrompt_1 = "".concat(formattedSystemPrompt, "\n\nHist\u00F3rico de conversa:\n");
                        // Adicionar histórico de mensagens ao prompt
                        recentMessages.forEach(function (msg) {
                            var role = msg.direction === 'inbound' ? 'Cliente' : 'Atendente';
                            fullPrompt_1 += "".concat(role, ": ").concat(msg.content, "\n");
                        });
                        // Adicionar mensagem atual do usuário
                        fullPrompt_1 += "\nCliente: ".concat(context.incomingMessage.content, "\n\nResposta:");
                        aiResponseText = void 0;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        aiService = new AiService(this.storage);
                        return [4 /*yield*/, aiService.answerQuestion(context.incomingMessage.content, context.conversation.id, context.conversation.contactId, context.conversation.channelId)];
                    case 2:
                        // Usar o método answerQuestion para gerar a resposta
                        aiResponseText = _a.sent();
                        if (!aiResponseText) {
                            throw new Error('Resposta vazia da IA');
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Erro ao gerar resposta com o modelo:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                error: "Erro ao gerar resposta com o provedor ".concat(modelProvider, ": ").concat(error_3)
                            }];
                    case 4:
                        if (!aiResponseText) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Resposta vazia do serviço de IA'
                                }];
                        }
                        processedResponse = this.templater.processTemplate(aiResponseText, context);
                        return [4 /*yield*/, this.storage.createMessage({
                                conversationId: context.conversation.id,
                                content: processedResponse,
                                contentType: 'text',
                                direction: 'outbound',
                                status: 'sent',
                                sentById: null, // Sistema
                            })];
                    case 5:
                        message = _a.sent();
                        if (!context.channel) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sendMessageViaChannel(context.channel, context.conversation.contactIdentifier, processedResponse)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/, {
                            success: true,
                            response: processedResponse,
                            message: message,
                        }];
                    case 8:
                        error_4 = _a.sent();
                        console.error('Erro ao executar chatbot:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4.message || 'Erro desconhecido ao executar chatbot',
                            }];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executa automação baseada em gatilho
     * @param automation Automação de gatilho
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    AutomationExecutor.prototype.executeTrigger = function (automation, context) {
        return __awaiter(this, void 0, void 0, function () {
            var triggerConfig, actions, _i, actions_1, action, responseTemplate, processedResponse, message, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        // Verificar se há conversa
                        if (!context.conversation) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Contexto incompleto: conversa ausente',
                                }];
                        }
                        triggerConfig = (automation.trigger || {});
                        actions = triggerConfig.actions || [];
                        // Se não houver ações definidas, não executar
                        if (!actions.length) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Nenhuma ação definida para o gatilho',
                                }];
                        }
                        _i = 0, actions_1 = actions;
                        _a.label = 1;
                    case 1:
                        if (!(_i < actions_1.length)) return [3 /*break*/, 4];
                        action = actions_1[_i];
                        return [4 /*yield*/, this.executeAction(action, context)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        responseTemplate = automation.response || '';
                        if (!responseTemplate) return [3 /*break*/, 8];
                        processedResponse = this.templater.processTemplate(responseTemplate, context);
                        return [4 /*yield*/, this.storage.createMessage({
                                conversationId: context.conversation.id,
                                content: processedResponse,
                                contentType: 'text',
                                direction: 'outbound',
                                status: 'sent',
                                sentById: null, // Sistema
                            })];
                    case 5:
                        message = _a.sent();
                        if (!context.channel) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sendMessageViaChannel(context.channel, context.conversation.contactIdentifier, processedResponse)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/, {
                            success: true,
                            response: processedResponse,
                            message: message,
                        }];
                    case 8: return [2 /*return*/, {
                            success: true,
                        }];
                    case 9:
                        error_5 = _a.sent();
                        console.error('Erro ao executar gatilho:', error_5);
                        return [2 /*return*/, {
                                success: false,
                                error: error_5.message || 'Erro desconhecido ao executar gatilho',
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executa automação agendada
     * @param automation Automação agendada
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    AutomationExecutor.prototype.executeScheduled = function (automation, context) {
        return __awaiter(this, void 0, void 0, function () {
            var scheduleConfig, actions, _i, actions_2, action, responseTemplate, processedResponse, message, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        // Verificar se há conversa
                        if (!context.conversation) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Contexto incompleto: conversa ausente',
                                }];
                        }
                        scheduleConfig = (automation.schedule || {});
                        actions = scheduleConfig.actions || [];
                        _i = 0, actions_2 = actions;
                        _a.label = 1;
                    case 1:
                        if (!(_i < actions_2.length)) return [3 /*break*/, 4];
                        action = actions_2[_i];
                        return [4 /*yield*/, this.executeAction(action, context)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        responseTemplate = automation.response || '';
                        if (!responseTemplate) return [3 /*break*/, 8];
                        processedResponse = this.templater.processTemplate(responseTemplate, context);
                        return [4 /*yield*/, this.storage.createMessage({
                                conversationId: context.conversation.id,
                                content: processedResponse,
                                contentType: 'text',
                                direction: 'outbound',
                                status: 'sent',
                                sentById: null, // Sistema
                            })];
                    case 5:
                        message = _a.sent();
                        if (!context.channel) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sendMessageViaChannel(context.channel, context.conversation.contactIdentifier, processedResponse)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/, {
                            success: true,
                            response: processedResponse,
                            message: message,
                        }];
                    case 8: return [2 /*return*/, {
                            success: true,
                        }];
                    case 9:
                        error_6 = _a.sent();
                        console.error('Erro ao executar automação agendada:', error_6);
                        return [2 /*return*/, {
                                success: false,
                                error: error_6.message || 'Erro desconhecido ao executar automação agendada',
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executa uma ação específica
     * @param action Ação a ser executada
     * @param context Contexto para execução
     */
    AutomationExecutor.prototype.executeAction = function (action, context) {
        return __awaiter(this, void 0, void 0, function () {
            var actionType, _a, newStatus, userId, tag, currentTags, updatedTags, tag_1, currentTags, updatedTags, field, value, processedValue, notificationType, message, userIds, processedMessage, _i, userIds_1, userId, webhookUrl, method, headers, payload, processedPayload, response, error_7, error_8;
            var _b;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 27, , 28]);
                        if (!action || !action.type) {
                            throw new Error('Ação inválida ou tipo não especificado');
                        }
                        actionType = action.type;
                        _a = actionType;
                        switch (_a) {
                            case 'update_conversation_status': return [3 /*break*/, 1];
                            case 'assign_to_user': return [3 /*break*/, 3];
                            case 'add_tag_to_contact': return [3 /*break*/, 7];
                            case 'remove_tag_from_contact': return [3 /*break*/, 10];
                            case 'update_contact_field': return [3 /*break*/, 13];
                            case 'send_notification': return [3 /*break*/, 15];
                            case 'execute_webhook': return [3 /*break*/, 20];
                        }
                        return [3 /*break*/, 25];
                    case 1:
                        // Atualizar status da conversa
                        if (!context.conversation) {
                            throw new Error('Conversa não disponível no contexto');
                        }
                        newStatus = action.status || 'open';
                        return [4 /*yield*/, this.storage.updateConversation(context.conversation.id, {
                                status: newStatus,
                            })];
                    case 2:
                        _e.sent();
                        return [3 /*break*/, 26];
                    case 3:
                        // Atribuir conversa a um usuário
                        if (!context.conversation) {
                            throw new Error('Conversa não disponível no contexto');
                        }
                        userId = action.userId || null;
                        if (!userId) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.storage.assignConversation(context.conversation.id, userId)];
                    case 4:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 5: throw new Error('ID do usuário não especificado para atribuição');
                    case 6: return [3 /*break*/, 26];
                    case 7:
                        // Adicionar tag ao contato
                        if (!context.contact) {
                            throw new Error('Contato não disponível no contexto');
                        }
                        tag = action.tag;
                        if (!tag) {
                            throw new Error('Tag não especificada');
                        }
                        currentTags = context.contact.tags || [];
                        if (!!currentTags.includes(tag)) return [3 /*break*/, 9];
                        updatedTags = __spreadArray(__spreadArray([], currentTags, true), [tag], false);
                        return [4 /*yield*/, this.storage.updateContact(context.contact.id, {
                                tags: updatedTags,
                            })];
                    case 8:
                        _e.sent();
                        _e.label = 9;
                    case 9: return [3 /*break*/, 26];
                    case 10:
                        // Remover tag do contato
                        if (!context.contact) {
                            throw new Error('Contato não disponível no contexto');
                        }
                        tag_1 = action.tag;
                        if (!tag_1) {
                            throw new Error('Tag não especificada');
                        }
                        currentTags = context.contact.tags || [];
                        if (!currentTags.includes(tag_1)) return [3 /*break*/, 12];
                        updatedTags = currentTags.filter(function (t) { return t !== tag_1; });
                        return [4 /*yield*/, this.storage.updateContact(context.contact.id, {
                                tags: updatedTags,
                            })];
                    case 11:
                        _e.sent();
                        _e.label = 12;
                    case 12: return [3 /*break*/, 26];
                    case 13:
                        // Atualizar campo do contato
                        if (!context.contact) {
                            throw new Error('Contato não disponível no contexto');
                        }
                        field = action.field;
                        value = action.value;
                        if (!field) {
                            throw new Error('Campo não especificado para atualização');
                        }
                        processedValue = typeof value === 'string'
                            ? this.templater.processTemplate(value, context)
                            : value;
                        return [4 /*yield*/, this.storage.updateContact(context.contact.id, (_b = {},
                                _b[field] = processedValue,
                                _b))];
                    case 14:
                        _e.sent();
                        return [3 /*break*/, 26];
                    case 15:
                        notificationType = action.notificationType || 'system';
                        message = action.message || '';
                        userIds = action.userIds || [];
                        if (!message) {
                            throw new Error('Mensagem de notificação não especificada');
                        }
                        processedMessage = this.templater.processTemplate(message, context);
                        _i = 0, userIds_1 = userIds;
                        _e.label = 16;
                    case 16:
                        if (!(_i < userIds_1.length)) return [3 /*break*/, 19];
                        userId = userIds_1[_i];
                        return [4 /*yield*/, this.storage.createNotification({
                                userId: userId,
                                type: notificationType,
                                message: processedMessage,
                                data: {
                                    conversationId: (_c = context.conversation) === null || _c === void 0 ? void 0 : _c.id,
                                    contactId: (_d = context.contact) === null || _d === void 0 ? void 0 : _d.id,
                                },
                                isRead: false,
                            })];
                    case 17:
                        _e.sent();
                        _e.label = 18;
                    case 18:
                        _i++;
                        return [3 /*break*/, 16];
                    case 19: return [3 /*break*/, 26];
                    case 20:
                        webhookUrl = action.url;
                        method = action.method || 'POST';
                        headers = action.headers || {};
                        payload = action.payload || {};
                        if (!webhookUrl) {
                            throw new Error('URL do webhook não especificada');
                        }
                        processedPayload = this.templater.processJSONTemplate(payload, context);
                        _e.label = 21;
                    case 21:
                        _e.trys.push([21, 23, , 24]);
                        return [4 /*yield*/, fetch(webhookUrl, {
                                method: method,
                                headers: __assign({ 'Content-Type': 'application/json' }, headers),
                                body: JSON.stringify(processedPayload),
                            })];
                    case 22:
                        response = _e.sent();
                        if (!response.ok) {
                            throw new Error("Resposta do webhook n\u00E3o foi bem-sucedida: ".concat(response.status));
                        }
                        return [3 /*break*/, 24];
                    case 23:
                        error_7 = _e.sent();
                        console.error('Erro ao executar webhook:', error_7);
                        throw new Error("Falha ao executar webhook: ".concat(error_7.message));
                    case 24: return [3 /*break*/, 26];
                    case 25: throw new Error("Tipo de a\u00E7\u00E3o desconhecido: ".concat(actionType));
                    case 26: return [3 /*break*/, 28];
                    case 27:
                        error_8 = _e.sent();
                        console.error('Erro ao executar ação:', error_8);
                        throw new Error("Falha ao executar a\u00E7\u00E3o ".concat(action.type, ": ").concat(error_8.message));
                    case 28: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Envia mensagem através do canal apropriado
     * @param channel Canal para envio
     * @param recipient Identificador do destinatário
     * @param content Conteúdo da mensagem
     */
    AutomationExecutor.prototype.sendMessageViaChannel = function (channel, recipient, content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    // Implementação do envio por canal será completada quando os adaptadores
                    // de canais forem implementados
                    console.log("Enviando mensagem via canal ".concat(channel.type, " para ").concat(recipient));
                    // Placeholder para implementação futura dos canais
                    // TODO: Implementar integração com adaptadores de canais
                }
                catch (error) {
                    console.error("Erro ao enviar mensagem pelo canal ".concat(channel.type, ":"), error);
                    throw new Error("Falha ao enviar mensagem: ".concat(error.message));
                }
                return [2 /*return*/];
            });
        });
    };
    return AutomationExecutor;
}());
export { AutomationExecutor };
