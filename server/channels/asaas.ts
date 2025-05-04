import axios from "axios";

type PaymentRequestData = {
  customer: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  description: string;
  dueDate: string;
};

export class AsaasHandler {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || "";
    this.baseUrl = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
  }
  
  async handleWebhook(data: any): Promise<void> {
    // Process Asaas payment webhooks
    try {
      const { event, payment } = data;
      
      console.log(`Received Asaas webhook event: ${event}`);
      console.log(`Payment ID: ${payment?.id}, Status: ${payment?.status}`);
      
      // Here you would update your internal payment status
      // and potentially notify users about payment status changes
    } catch (error) {
      console.error("Error processing Asaas webhook:", error);
    }
  }
  
  async createPayment(paymentData: PaymentRequestData): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error("Asaas API Key not configured");
      }
      
      // Create or update customer
      const customerResponse = await this.findOrCreateCustomer({
        name: paymentData.name,
        email: paymentData.email,
        phone: paymentData.phone,
        externalReference: paymentData.customer
      });
      
      // Create payment
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          customer: customerResponse.id,
          billingType: "BOLETO",
          dueDate: paymentData.dueDate,
          value: paymentData.amount,
          description: paymentData.description,
          externalReference: `eduChat_${Date.now()}`
        },
        {
          headers: {
            "Content-Type": "application/json",
            "access_token": this.apiKey
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error("Error creating payment via Asaas:", error);
      throw error;
    }
  }
  
  private async findOrCreateCustomer(customerData: any): Promise<any> {
    try {
      // Try to find customer by externalReference
      const findResponse = await axios.get(
        `${this.baseUrl}/customers?externalReference=${customerData.externalReference}`,
        {
          headers: {
            "Content-Type": "application/json",
            "access_token": this.apiKey
          }
        }
      );
      
      if (findResponse.data.data && findResponse.data.data.length > 0) {
        return findResponse.data.data[0];
      }
      
      // Create new customer
      const createResponse = await axios.post(
        `${this.baseUrl}/customers`,
        {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          externalReference: customerData.externalReference
        },
        {
          headers: {
            "Content-Type": "application/json",
            "access_token": this.apiKey
          }
        }
      );
      
      return createResponse.data;
    } catch (error) {
      console.error("Error finding or creating customer via Asaas:", error);
      throw error;
    }
  }
}
