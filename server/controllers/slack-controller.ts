import { Request, Response } from 'express';
import { readSlackHistory, sendNotification, sendSlackMessage } from '../services/slack';

/**
 * Controller para integrações com Slack
 */
export class SlackController {
  /**
   * Envia uma mensagem para um canal específico do Slack
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const { text, channel, blocks } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texto da mensagem é obrigatório' });
      }

      // Usar o canal fornecido ou o canal padrão da variável de ambiente
      const targetChannel = channel || process.env.SLACK_CHANNEL_ID;

      if (!targetChannel) {
        return res.status(400).json({ error: 'Canal não especificado e canal padrão não configurado' });
      }

      const messagePayload = {
        channel: targetChannel,
        text,
        blocks: blocks || undefined
      };

      const result = await sendSlackMessage(messagePayload);
      
      return res.status(200).json({ 
        success: true, 
        messageId: result,
        channel: targetChannel
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem Slack:', error);
      return res.status(500).json({ 
        error: 'Falha ao enviar mensagem para o Slack',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Obtém o histórico de mensagens de um canal
   */
  async getChannelHistory(req: Request, res: Response) {
    try {
      const { channelId, limit } = req.query;
      
      if (!channelId) {
        return res.status(400).json({ error: 'ID do canal é obrigatório' });
      }

      const messageLimit = limit ? parseInt(limit as string) : 100;
      
      const history = await readSlackHistory(channelId as string, messageLimit);
      
      return res.status(200).json(history);
    } catch (error) {
      console.error('Erro ao obter histórico Slack:', error);
      return res.status(500).json({ 
        error: 'Falha ao obter histórico de mensagens',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Envia uma notificação para o canal padrão configurado
   */
  async sendNotification(req: Request, res: Response) {
    try {
      const { text, blocks } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texto da notificação é obrigatório' });
      }

      const result = await sendNotification(text, blocks);
      
      return res.status(200).json({ 
        success: true, 
        messageId: result
      });
    } catch (error) {
      console.error('Erro ao enviar notificação Slack:', error);
      return res.status(500).json({ 
        error: 'Falha ao enviar notificação para o Slack',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}