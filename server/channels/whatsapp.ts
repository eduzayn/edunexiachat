import { BaseChannelHandler, ChannelHandlerOptions } from "./index";
import { IStorage } from "../storage";

export class WhatsAppHandler extends BaseChannelHandler {
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
  }
  
  // Base implementation for WhatsApp channels
  async handleWebhook(data: any): Promise<void> {
    throw new Error("Method not implemented in base WhatsApp handler");
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    throw new Error("Method not implemented in base WhatsApp handler");
  }
}
