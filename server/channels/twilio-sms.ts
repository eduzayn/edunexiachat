import { BaseChannelHandler } from "./index";
import { IStorage } from "../storage";
import axios from "axios";

export class TwilioSmsHandler extends BaseChannelHandler {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_PHONE_NUMBER || "";
  }
  
  async handleWebhook(data: any): Promise<void> {
    try {
      // Check if this is an SMS message (not WhatsApp)
      if (data.SmsMessageSid && data.From && data.To && data.Body && 
          !data.From.includes("whatsapp:") && !data.To.includes("whatsapp:")) {
        
        await this.processIncomingMessage({
          from: data.From,
          to: data.To,
          messageId: data.SmsMessageSid,
          timestamp: Date.now(),
          content: data.Body,
          contentType: "text",
          channelType: "sms_twilio",
          channelName: "SMS (Twilio)"
        });
      }
    } catch (error) {
      console.error("Error processing Twilio SMS webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      if (!this.accountSid || !this.authToken || !this.fromNumber) {
        throw new Error("Twilio credentials not properly configured");
      }
      
      // Remove any "whatsapp:" prefix if present
      const to = recipient.replace("whatsapp:", "");
      const from = this.fromNumber.replace("whatsapp:", "");
      
      // Use basic auth for Twilio API
      const auth = {
        username: this.accountSid,
        password: this.authToken
      };
      
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        new URLSearchParams({
          To: to,
          From: from,
          Body: content
        }),
        { auth }
      );
    } catch (error) {
      console.error("Error sending SMS via Twilio:", error);
      throw error;
    }
  }
}