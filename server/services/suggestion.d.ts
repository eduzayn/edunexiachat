/**
 * Sugere respostas para uma mensagem baseada no histórico da conversa
 * e nos pares de perguntas e respostas
 * @param message Mensagem para a qual gerar sugestões
 * @param conversationId ID da conversa
 * @returns Array de sugestões de resposta
 */
export declare function suggestReply(message: string, conversationId: number): Promise<string[]>;
