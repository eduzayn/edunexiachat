import { type ChatPostMessageArguments, WebClient } from "@slack/web-api"

// Verificar se as credenciais do Slack estão configuradas
if (!process.env.SLACK_BOT_TOKEN) {
  console.warn("SLACK_BOT_TOKEN não configurado. Funcionalidades Slack indisponíveis.");
}

if (!process.env.SLACK_CHANNEL_ID) {
  console.warn("SLACK_CHANNEL_ID não configurado. Funcionalidades Slack usarão canal padrão.");
}

// Criar cliente Slack condicional
let slack: WebClient | null = null;

if (process.env.SLACK_BOT_TOKEN) {
  slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  console.log("Cliente Slack inicializado com sucesso");
} else {
  console.log("Cliente Slack não inicializado por falta de token");
}

/**
 * Envia uma mensagem estruturada para um canal no Slack usando a Slack Web API
 * Prefere usar ID do canal ao invés de nomes pois eles não mudam quando o canal é renomeado.
 * @param message - Mensagem estruturada para enviar
 * @returns Promise resolvendo para o timestamp da mensagem enviada
 */
async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  if (!slack) {
    console.error('Erro ao enviar mensagem Slack: Cliente não inicializado');
    throw new Error('Cliente Slack não inicializado');
  }

  try {
    // Enviar a mensagem
    const response = await slack.chat.postMessage(message);

    // Retornar o timestamp da mensagem enviada
    return response.ts;
  } catch (error) {
    console.error('Erro ao enviar mensagem Slack:', error);
    throw error;
  }
}

/**
 * Ler o histórico de um canal
 * @param channel_id - ID do canal para ler o histórico de mensagens
 * @returns Promise resolvendo para as mensagens
 */
async function readSlackHistory(
  channelId: string,
  messageLimit: number = 100,
): Promise<any> {
  if (!slack) {
    console.error('Erro ao ler histórico Slack: Cliente não inicializado');
    throw new Error('Cliente Slack não inicializado');
  }

  try {
    // Obter mensagens
    return await slack.conversations.history({
      channel: channelId,
      limit: messageLimit,
    });
  } catch (error) {
    console.error('Erro ao ler histórico Slack:', error);
    throw error;
  }
}

/**
 * Função auxiliar para enviar uma notificação para o canal padrão
 * @param text - Texto da mensagem
 * @param blocks - Blocos formatados (opcional)
 */
async function sendNotification(text: string, blocks?: any[]): Promise<string | undefined> {
  const channelId = process.env.SLACK_CHANNEL_ID;
  
  if (!channelId) {
    throw new Error('SLACK_CHANNEL_ID não configurado');
  }

  return sendSlackMessage({
    channel: channelId,
    text,
    blocks
  });
}

export { sendSlackMessage, readSlackHistory, sendNotification };