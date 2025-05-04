import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Channel } from "@shared/schema";
import { AppShell } from "@/components/layout/app-shell";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Brain,
  Clock,
  Database as DatabaseIcon,
  DollarSign,
  Facebook,
  FileText,
  Globe,
  HelpCircle,
  Instagram,
  Laptop,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Phone,
  Plus,
  QrCode,
  SendHorizontal,
  Settings,
  Trash2,
  User,
  Wallet,
  Bell
} from "lucide-react";

// Schema for WhatsApp Twilio configuration
const twilioConfigSchema = z.object({
  accountSid: z.string().min(1, { message: "Account SID é obrigatório" }),
  authToken: z.string().min(1, { message: "Auth Token é obrigatório" }),
  phoneNumber: z.string().min(1, { message: "Número de telefone é obrigatório" }),
});

// Schema for WhatsApp Zap API configuration
const zapApiConfigSchema = z.object({
  apiToken: z.string().min(1, { message: "API Token é obrigatório" }),
  instanceId: z.string().min(1, { message: "ID da Instância é obrigatório" }),
});

// Schema for WhatsApp Business API configuration
const whatsappBusinessConfigSchema = z.object({
  accessToken: z.string().min(1, { message: "Token de acesso é obrigatório" }),
  phoneNumberId: z.string().min(1, { message: "ID do número de telefone é obrigatório" }),
  businessAccountId: z.string().optional(),
  version: z.string().default("v18.0"),
});

// Schema for Meta (Facebook/Instagram) configuration
const metaConfigSchema = z.object({
  pageId: z.string().min(1, { message: "ID da Página é obrigatório" }),
  pageToken: z.string().min(1, { message: "Token da Página é obrigatório" }),
});

// Schema for Asaas configuration
const asaasConfigSchema = z.object({
  apiKey: z.string().min(1, { message: "API Key é obrigatório" }),
  sandbox: z.boolean().default(false),
});

// Schema for SendGrid email configuration
const sendgridConfigSchema = z.object({
  apiKey: z.string().min(1, { message: "API Key é obrigatório" }),
  fromEmail: z.string().email({ message: "Email do remetente válido é obrigatório" }),
});

// Schema for Telegram configuration
const telegramConfigSchema = z.object({
  botToken: z.string().min(1, { message: "Token do Bot é obrigatório" }),
  username: z.string().optional(),
});

// Schema for Slack configuration
const slackConfigSchema = z.object({
  botToken: z.string().min(1, { message: "Bot Token é obrigatório" }),
  channelId: z.string().min(1, { message: "ID do Canal é obrigatório" }),
});

// Schema for Discord configuration
const discordConfigSchema = z.object({
  botToken: z.string().min(1, { message: "Token do Bot é obrigatório" }),
  channelId: z.string().min(1, { message: "ID do Canal é obrigatório" }),
});

// Schema for SMS Twilio configuration 
const smsConfigSchema = z.object({
  accountSid: z.string().min(1, { message: "Account SID é obrigatório" }),
  authToken: z.string().min(1, { message: "Auth Token é obrigatório" }),
  phoneNumber: z.string().min(1, { message: "Número de telefone é obrigatório" }),
});

// Schema for channel creation
const channelSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  type: z.string().min(1, { message: "Tipo é obrigatório" }),
  config: z.string().min(1, { message: "Configuração é obrigatória" }),
  isActive: z.boolean().default(true),
});

// Schema para fontes de dados de treinamento de IA
const aiDataSourceSchema = z.object({
  name: z.string().min(1, { message: "Nome da fonte é obrigatório" }),
  type: z.enum(["document", "website", "api", "qa_pairs"], { 
    required_error: "Tipo da fonte é obrigatório" 
  }),
  url: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Schema para pares de perguntas e respostas para IA
const aiQaPairSchema = z.object({
  question: z.string().min(1, { message: "Pergunta é obrigatória" }),
  answer: z.string().min(1, { message: "Resposta é obrigatória" }),
  sourceId: z.number().optional(),
});

type TwilioConfigType = z.infer<typeof twilioConfigSchema>;
type ZapApiConfigType = z.infer<typeof zapApiConfigSchema>;
type WhatsappBusinessConfigType = z.infer<typeof whatsappBusinessConfigSchema>;
type MetaConfigType = z.infer<typeof metaConfigSchema>;
type AsaasConfigType = z.infer<typeof asaasConfigSchema>;
type SendgridConfigType = z.infer<typeof sendgridConfigSchema>;
type TelegramConfigType = z.infer<typeof telegramConfigSchema>;
type SlackConfigType = z.infer<typeof slackConfigSchema>;
type DiscordConfigType = z.infer<typeof discordConfigSchema>;
type SmsConfigType = z.infer<typeof smsConfigSchema>;
type ChannelType = z.infer<typeof channelSchema>;
type AiDataSourceType = z.infer<typeof aiDataSourceSchema>;
type AiQaPairType = z.infer<typeof aiQaPairSchema>;

export default function SettingsPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [isAddingDataSource, setIsAddingDataSource] = useState(false);
  const [isAddingQaPair, setIsAddingQaPair] = useState(false);
  const [channelType, setChannelType] = useState("whatsapp_twilio");
  const [dataSourceType, setDataSourceType] = useState("document");
  
  // Fetch channels
  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      return await apiRequest<Channel[]>("/api/channels");
    },
  });
  
  // Create new channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: ChannelType) => {
      return await apiRequest("/api/channels", { 
        method: "POST", 
        data: channelData 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Canal adicionado",
        description: "O canal foi adicionado com sucesso.",
      });
      setIsAddingChannel(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar canal",
        description: error.message || "Ocorreu um erro ao adicionar o canal.",
        variant: "destructive",
      });
    },
  });
  
  // Setup form for Twilio configuration
  const twilioForm = useForm<TwilioConfigType>({
    resolver: zodResolver(twilioConfigSchema),
    defaultValues: {
      accountSid: "",
      authToken: "",
      phoneNumber: "",
    },
  });
  
  // Setup form for Zap API configuration
  const zapApiForm = useForm<ZapApiConfigType>({
    resolver: zodResolver(zapApiConfigSchema),
    defaultValues: {
      apiToken: "",
      instanceId: "",
    },
  });
  
  // Setup form for WhatsApp Business configuration
  const whatsappBusinessForm = useForm<WhatsappBusinessConfigType>({
    resolver: zodResolver(whatsappBusinessConfigSchema),
    defaultValues: {
      accessToken: "",
      phoneNumberId: "",
      businessAccountId: "",
      version: "v18.0",
    },
  });
  
  // Setup form for Meta configuration
  const metaForm = useForm<MetaConfigType>({
    resolver: zodResolver(metaConfigSchema),
    defaultValues: {
      pageId: "",
      pageToken: "",
    },
  });
  
  // Setup form for Asaas configuration
  const asaasForm = useForm<AsaasConfigType>({
    resolver: zodResolver(asaasConfigSchema),
    defaultValues: {
      apiKey: "",
      sandbox: true,
    },
  });
  
  // Setup form for SendGrid configuration
  const sendgridForm = useForm<SendgridConfigType>({
    resolver: zodResolver(sendgridConfigSchema),
    defaultValues: {
      apiKey: "",
      fromEmail: "",
    },
  });
  
  // Setup form for Telegram configuration
  const telegramForm = useForm<TelegramConfigType>({
    resolver: zodResolver(telegramConfigSchema),
    defaultValues: {
      botToken: "",
      username: "",
    },
  });
  
  // Setup form for Slack configuration
  const slackForm = useForm<SlackConfigType>({
    resolver: zodResolver(slackConfigSchema),
    defaultValues: {
      botToken: "",
      channelId: "",
    },
  });
  
  // Setup form for Discord configuration
  const discordForm = useForm<DiscordConfigType>({
    resolver: zodResolver(discordConfigSchema),
    defaultValues: {
      botToken: "",
      channelId: "",
    },
  });
  
  // Setup form for SMS Twilio configuration
  const smsForm = useForm<SmsConfigType>({
    resolver: zodResolver(smsConfigSchema),
    defaultValues: {
      accountSid: "",
      authToken: "",
      phoneNumber: "",
    },
  });
  
  // Setup form for AI Data Source
  const aiDataSourceForm = useForm<AiDataSourceType>({
    resolver: zodResolver(aiDataSourceSchema),
    defaultValues: {
      name: "",
      type: "document",
      content: "",
      url: "",
      description: "",
      isActive: true
    },
  });
  
  // Setup form for AI QA Pairs
  const aiQaPairForm = useForm<AiQaPairType>({
    resolver: zodResolver(aiQaPairSchema),
    defaultValues: {
      question: "",
      answer: "",
    },
  });
  
  // Fetch AI data sources
  const { data: aiDataSources = [], isLoading: isLoadingAiSources } = useQuery({
    queryKey: ["/api/ai/data-sources"],
    queryFn: async () => {
      try {
        return await apiRequest<any[]>("/api/ai/data-sources");
      } catch (error) {
        console.error("Erro ao carregar fontes de dados de IA:", error);
        return [];
      }
    },
  });
  
  // Fetch AI QA pairs
  const { data: aiQaPairs = [], isLoading: isLoadingQaPairs } = useQuery({
    queryKey: ["/api/ai/qa-pairs"],
    queryFn: async () => {
      try {
        return await apiRequest<any[]>("/api/ai/qa-pairs");
      } catch (error) {
        console.error("Erro ao carregar pares de perguntas e respostas:", error);
        return [];
      }
    },
  });
  
  // Create AI data source mutation
  const createAiDataSourceMutation = useMutation({
    mutationFn: async (data: AiDataSourceType) => {
      return await apiRequest("/api/ai/data-sources", {
        method: "POST",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/data-sources"] });
      toast({
        title: "Fonte de dados adicionada",
        description: "A fonte de dados para IA foi adicionada com sucesso.",
      });
      setIsAddingDataSource(false);
      aiDataSourceForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar fonte de dados",
        description: error.message || "Ocorreu um erro ao adicionar a fonte de dados.",
        variant: "destructive",
      });
    },
  });
  
  // Create AI QA pair mutation
  const createAiQaPairMutation = useMutation({
    mutationFn: async (data: AiQaPairType) => {
      return await apiRequest("/api/ai/qa-pairs", {
        method: "POST",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/qa-pairs"] });
      toast({
        title: "Par de pergunta e resposta adicionado",
        description: "O par de pergunta e resposta foi adicionado com sucesso.",
      });
      setIsAddingQaPair(false);
      aiQaPairForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar pergunta e resposta",
        description: error.message || "Ocorreu um erro ao adicionar o par de pergunta e resposta.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for AI data source
  const handleDataSourceSubmit = (data: AiDataSourceType) => {
    createAiDataSourceMutation.mutate(data);
  };
  
  // Handle form submission for AI QA pair
  const handleQaPairSubmit = (data: AiQaPairType) => {
    createAiQaPairMutation.mutate(data);
  };
  
  // Get the form for QA pair
  const getQaPairForm = () => {
    return (
      <Form {...aiQaPairForm}>
        <form onSubmit={aiQaPairForm.handleSubmit(handleQaPairSubmit)} className="space-y-4">
          <FormField
            control={aiQaPairForm.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pergunta</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Digite a pergunta"
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Pergunta que será usada para treinamento da IA.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={aiQaPairForm.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resposta</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Digite a resposta"
                    rows={5}
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Resposta que a IA deverá fornecer quando receber essa pergunta.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {aiDataSources && aiDataSources.length > 0 && (
            <FormField
              control={aiQaPairForm.control}
              name="sourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte de dados (opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma fonte de dados" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {aiDataSources.map((source) => (
                        <SelectItem key={source.id} value={source.id.toString()}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Associar este par a uma fonte de dados específica.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddingQaPair(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createAiQaPairMutation.isPending}>
              {createAiQaPairMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };
  
  // Get the appropriate form for AI data source based on type
  const getDataSourceForm = () => {
    return (
      <Form {...aiDataSourceForm}>
        <form onSubmit={aiDataSourceForm.handleSubmit(handleDataSourceSubmit)} className="space-y-4">
          <FormField
            control={aiDataSourceForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Fonte</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da fonte de dados" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={aiDataSourceForm.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Fonte</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setDataSourceType(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de fonte" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="qa_pairs">Perguntas e Respostas</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {dataSourceType === "website" && (
            <FormField
              control={aiDataSourceForm.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.exemplo.com.br" {...field} />
                  </FormControl>
                  <FormDescription>
                    Endereço do website que será usado como fonte de conhecimento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {dataSourceType === "api" && (
            <FormField
              control={aiDataSourceForm.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da API</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.exemplo.com.br/endpoint" {...field} />
                  </FormControl>
                  <FormDescription>
                    Endpoint da API que fornecerá dados para o conhecimento da IA.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {(dataSourceType === "document" || dataSourceType === "qa_pairs") && (
            <FormField
              control={aiDataSourceForm.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={dataSourceType === "document" 
                        ? "Insira o texto do documento" 
                        : "Insira os pares de perguntas e respostas (opcional)"}
                      rows={5}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {dataSourceType === "document" 
                      ? "Texto completo do documento que será usado como conhecimento." 
                      : "Pares de perguntas e respostas que serão usados no treinamento."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={aiDataSourceForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descrição da fonte de dados"
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Descrição opcional sobre esta fonte de dados.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={aiDataSourceForm.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Ativo
                  </FormLabel>
                  <FormDescription>
                    Essa fonte de dados será usada no treinamento da IA.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddingDataSource(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createAiDataSourceMutation.isPending}>
              {createAiDataSourceMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };
  
  // Handle form submission based on channel type
  const handleChannelSubmit = (data: any) => {
    let configStr = "";
    
    // Serializar a configuração
    configStr = JSON.stringify(data);
    
    // Get appropriate channel name based on type
    let name = "";
    switch (channelType) {
      case "whatsapp_twilio":
        name = `WhatsApp (${data.phoneNumber})`;
        break;
      case "whatsapp_zap":
        name = "WhatsApp (Zap API)";
        break;
      case "whatsapp_business":
        name = `WhatsApp Business (${data.phoneNumberId})`;
        break;
      case "messenger":
        name = "Facebook Messenger";
        break;
      case "instagram":
        name = "Instagram Direct";
        break;
      case "sms_twilio":
        name = `SMS Twilio (${data.phoneNumber})`;
        break;
      case "email_sendgrid":
        name = `Email (${data.fromEmail})`;
        break;
      case "telegram":
        name = "Telegram Bot";
        break;
      case "slack":
        name = "Slack API";
        break;
      case "discord":
        name = "Discord Bot";
        break;
      default:
        name = "Novo Canal";
        break;
    }
    
    createChannelMutation.mutate({
      name,
      type: channelType,
      config: configStr,
      isActive: true,
    });
  };
  
  // Get the appropriate form and submit handler for the current channel type
  const getChannelForm = () => {
    switch (channelType) {
      case "whatsapp_twilio":
        return (
          <Form {...twilioForm}>
            <form onSubmit={twilioForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={twilioForm.control}
                name="accountSid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account SID</FormLabel>
                    <FormControl>
                      <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontre no painel da Twilio em Dashboard {">"}  Settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={twilioForm.control}
                name="authToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontre no painel da Twilio em Dashboard {">"} Settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={twilioForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="+5511999999999" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número completo com código do país (ex: +5511999999999)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      

        case "whatsapp_zap":
        return (
          <Form {...zapApiForm}>
            <form onSubmit={zapApiForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={zapApiForm.control}
                name="apiToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Token</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="API Token da ZapAPI" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Token de acesso fornecido pela ZapAPI para integração
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={zapApiForm.control}
                name="instanceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Instância</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="ID da instância ZapAPI" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Identificador único da sua instância na plataforma
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-center py-6">
                <div className="border border-dashed border-gray-300 rounded-lg w-48 h-48 flex flex-col items-center justify-center">
                  <QrCode className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 text-center">
                    QR Code para conexão<br />aparecerá aqui após salvar
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      
      case "whatsapp_business":
        return (
          <Form {...whatsappBusinessForm}>
            <form onSubmit={whatsappBusinessForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={whatsappBusinessForm.control}
                name="accessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token de Acesso</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Token de acesso da API do WhatsApp Business" {...field} />
                    </FormControl>
                    <FormDescription>
                      Token de longa duração fornecido pela Meta para Aplicativos Business
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={whatsappBusinessForm.control}
                name="phoneNumberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Número de Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="ID do número no WhatsApp Business API" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontrado no painel do Facebook Business
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={whatsappBusinessForm.control}
                name="businessAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Conta Business (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ID da Conta Business" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={whatsappBusinessForm.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Versão da API</FormLabel>
                    <FormControl>
                      <Input placeholder="Versão da Graph API (ex: v18.0)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Versão da API do Facebook Graph (padrão: v18.0)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      
      case "messenger":
      case "instagram":
        return (
          <Form {...metaForm}>
            <form onSubmit={metaForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={metaForm.control}
                name="pageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Página</FormLabel>
                    <FormControl>
                      <Input placeholder="ID da página do Facebook" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontre nas configurações da sua página no Facebook
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={metaForm.control}
                name="pageToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token de Acesso da Página</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Token de acesso da página"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Gere um token de acesso no Facebook Developers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      
      // Asaas movido para aba de Gateways de Pagamento
      
      case "email_sendgrid":
        return (
          <Form {...sendgridForm}>
            <form onSubmit={sendgridForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={sendgridForm.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key do SendGrid</FormLabel>
                    <FormControl>
                      <Input placeholder="SG.xxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontre no painel do SendGrid em Settings {">"} API Keys
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sendgridForm.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do Remetente</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@dominio.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Utilize um email verificado no SendGrid como remetente autorizado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
        
      case "sms_twilio":
        return (
          <Form {...smsForm}>
            <form onSubmit={smsForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={smsForm.control}
                name="accountSid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account SID</FormLabel>
                    <FormControl>
                      <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontre no painel da Twilio em Dashboard {">"} Settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={smsForm.control}
                name="authToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Encontre no painel da Twilio em Dashboard {">"} Settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={smsForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="+5511999999999" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número completo com código do país (ex: +5511999999999)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
        
      case "telegram":
        return (
          <Form {...telegramForm}>
            <form onSubmit={telegramForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={telegramForm.control}
                name="botToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token do Bot</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ" {...field} />
                    </FormControl>
                    <FormDescription>
                      Obtenha com o BotFather no Telegram
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={telegramForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário do Bot (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="meu_bot" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
        
      case "slack":
        return (
          <Form {...slackForm}>
            <form onSubmit={slackForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={slackForm.control}
                name="botToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Token</FormLabel>
                    <FormControl>
                      <Input placeholder="xoxb-xxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Obtenha em api.slack.com/apps
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={slackForm.control}
                name="channelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Canal</FormLabel>
                    <FormControl>
                      <Input placeholder="C1234567890" {...field} />
                    </FormControl>
                    <FormDescription>
                      ID do canal no qual o bot irá interagir
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
        
      case "discord":
        return (
          <Form {...discordForm}>
            <form onSubmit={discordForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
              <FormField
                control={discordForm.control}
                name="botToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token do Bot</FormLabel>
                    <FormControl>
                      <Input placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>
                      Obtenha no portal de Desenvolvedores do Discord
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={discordForm.control}
                name="channelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Canal</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012345678" {...field} />
                    </FormControl>
                    <FormDescription>
                      ID do canal no qual o bot irá interagir
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <AppShell title="Configurações">
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Configurações</h1>
        </div>
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="channels">Canais</TabsTrigger>
            <TabsTrigger value="gateways">Gateways de Pagamento</TabsTrigger>
            <TabsTrigger value="ai">IA Personalizada</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="general">Geral</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="space-y-6">
              {/* Channel List */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Canais de Comunicação</h2>
                <Dialog open={isAddingChannel} onOpenChange={setIsAddingChannel}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Canal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Canal</DialogTitle>
                      <DialogDescription>
                        Configure um novo canal de comunicação para sua plataforma.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <div className="flex flex-col space-y-4 mb-6">
                        <p className="text-sm font-medium text-gray-700">Tipo de Canal</p>
                        <div className="grid grid-cols-4 gap-4">
                          <button
                            type="button"
                            onClick={() => setChannelType("whatsapp_twilio")}
                            className={`p-4 rounded-lg border ${
                              channelType === "whatsapp_twilio"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <MessageSquare className={`h-8 w-8 ${
                              channelType === "whatsapp_twilio" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">WhatsApp<br />(Twilio API)</span>
                          </button>
                          

                          
                          <button
                            type="button"
                            onClick={() => setChannelType("whatsapp_business")}
                            className={`p-4 rounded-lg border ${
                              channelType === "whatsapp_business"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <MessageSquare className={`h-8 w-8 ${
                              channelType === "whatsapp_business" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">WhatsApp<br />Business API</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("messenger")}
                            className={`p-4 rounded-lg border ${
                              channelType === "messenger"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <Facebook className={`h-8 w-8 ${
                              channelType === "messenger" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">Facebook<br />Messenger</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("instagram")}
                            className={`p-4 rounded-lg border ${
                              channelType === "instagram"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <Instagram className={`h-8 w-8 ${
                              channelType === "instagram" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">Instagram<br />Direct</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("sms_twilio")}
                            className={`p-4 rounded-lg border ${
                              channelType === "sms_twilio"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <MessageCircle className={`h-8 w-8 ${
                              channelType === "sms_twilio" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">SMS<br />(Twilio)</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("email_sendgrid")}
                            className={`p-4 rounded-lg border ${
                              channelType === "email_sendgrid"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <Mail className={`h-8 w-8 ${
                              channelType === "email_sendgrid" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">Email<br />(SendGrid)</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("telegram")}
                            className={`p-4 rounded-lg border ${
                              channelType === "telegram"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <SendHorizontal className={`h-8 w-8 ${
                              channelType === "telegram" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">Telegram<br />Bot</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("slack")}
                            className={`p-4 rounded-lg border ${
                              channelType === "slack"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <MessageSquare className={`h-8 w-8 ${
                              channelType === "slack" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">Slack<br />API</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setChannelType("discord")}
                            className={`p-4 rounded-lg border ${
                              channelType === "discord"
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            } flex flex-col items-center justify-center space-y-2 transition-colors`}
                          >
                            <MessagesSquare className={`h-8 w-8 ${
                              channelType === "discord" ? "text-primary-500" : "text-gray-400"
                            }`} />
                            <span className="text-sm font-medium">Discord<br />Bot</span>
                          </button>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      {getChannelForm()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64 col-span-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : Array.isArray(channels) && channels.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200 col-span-2">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum canal configurado</h3>
                    <p className="text-gray-500 mb-4">
                      Adicione canais de comunicação para começar a receber mensagens.
                    </p>
                    <Button
                      onClick={() => setIsAddingChannel(true)}
                    >
                      Adicionar Canal
                    </Button>
                  </div>
                ) : (
                  Array.isArray(channels) && channels.map((channel) => {
                    let icon;
                    switch (channel.type) {
                      case "whatsapp_twilio":
                        icon = <MessageSquare className="h-5 w-5 text-green-500" />;
                        break;
                      case "whatsapp_zap":
                        icon = <QrCode className="h-5 w-5 text-green-500" />;
                        break;
                      case "whatsapp_business":
                        icon = <MessageSquare className="h-5 w-5 text-green-600" />;
                        break;
                      case "messenger":
                        icon = <Facebook className="h-5 w-5 text-blue-600" />;
                        break;
                      case "instagram":
                        icon = <Instagram className="h-5 w-5 text-purple-600" />;
                        break;
                      case "sms_twilio":
                        icon = <MessageCircle className="h-5 w-5 text-red-500" />;
                        break;
                      case "email_sendgrid":
                        icon = <Mail className="h-5 w-5 text-blue-500" />;
                        break;
                      case "telegram":
                        icon = <SendHorizontal className="h-5 w-5 text-blue-400" />;
                        break;
                      case "slack":
                        icon = <MessageSquare className="h-5 w-5 text-yellow-500" />;
                        break;
                      case "discord":
                        icon = <MessagesSquare className="h-5 w-5 text-indigo-500" />;
                        break;
                      case "asaas":
                        icon = <DollarSign className="h-5 w-5 text-blue-500" />;
                        break;
                      default:
                        icon = <MessageSquare className="h-5 w-5 text-gray-500" />;
                    }
                    
                    return (
                      <Card key={channel.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              {icon}
                              <CardTitle className="ml-2">{channel.name}</CardTitle>
                            </div>
                            <Switch
                              checked={channel.isActive}
                              // In a real app, this would call an API to update the channel status
                              // onCheckedChange={(checked) => handleToggleChannel(channel.id, checked)}
                            />
                          </div>
                          <CardDescription>
                            {channel.type === "whatsapp_twilio" && "WhatsApp via Twilio API"}
                            {channel.type === "whatsapp_zap" && "WhatsApp via QR Code"}
                            {channel.type === "whatsapp_business" && "WhatsApp via Business Cloud API"}
                            {channel.type === "messenger" && "Facebook Messenger"}
                            {channel.type === "instagram" && "Instagram Direct Messages"}
                            {channel.type === "sms_twilio" && "SMS via Twilio"}
                            {channel.type === "email_sendgrid" && "Email via SendGrid"}
                            {channel.type === "telegram" && "Telegram Bot"}
                            {channel.type === "slack" && "Slack API"}
                            {channel.type === "discord" && "Discord Bot"}
                            {channel.type === "asaas" && "Asaas Pagamentos"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {channel.type.includes("whatsapp") && (
                            <p className="text-sm text-gray-500">
                              Receba e envie mensagens via WhatsApp
                            </p>
                          )}
                          {channel.type === "messenger" && (
                            <p className="text-sm text-gray-500">
                              Integração com mensagens do Facebook
                            </p>
                          )}
                          {channel.type === "instagram" && (
                            <p className="text-sm text-gray-500">
                              Integração com mensagens diretas do Instagram
                            </p>
                          )}
                          {channel.type === "sms_twilio" && (
                            <p className="text-sm text-gray-500">
                              Envio e recebimento de mensagens SMS
                            </p>
                          )}
                          {channel.type === "email_sendgrid" && (
                            <p className="text-sm text-gray-500">
                              Envio e recebimento de emails
                            </p>
                          )}
                          {channel.type === "telegram" && (
                            <p className="text-sm text-gray-500">
                              Comunicação via bot do Telegram
                            </p>
                          )}
                          {channel.type === "slack" && (
                            <p className="text-sm text-gray-500">
                              Integração com canais do Slack
                            </p>
                          )}
                          {channel.type === "discord" && (
                            <p className="text-sm text-gray-500">
                              Integração com servidores do Discord
                            </p>
                          )}
                          {channel.type === "asaas" && (
                            <p className="text-sm text-gray-500">
                              Integração para geração de cobranças
                            </p>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="w-full">
                            Configurar
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
            
          <TabsContent value="gateways" className="space-y-6">
              {/* Gateways List */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Gateways de Pagamento</h2>
                <Dialog open={isAddingGateway} onOpenChange={setIsAddingGateway}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Gateway
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Gateway de Pagamento</DialogTitle>
                      <DialogDescription>
                        Configure um novo gateway de pagamento para sua plataforma.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <div className="flex flex-col space-y-4 mb-6">
                        <p className="text-sm font-medium text-gray-700">Tipo de Gateway</p>
                        <div className="grid grid-cols-4 gap-4">
                          <button
                            type="button"
                            className="p-4 rounded-lg border border-primary-500 bg-primary-50 flex flex-col items-center justify-center space-y-2 transition-colors"
                          >
                            <DollarSign className="h-8 w-8 text-primary-500" />
                            <span className="text-sm font-medium">Asaas<br />Pagamentos</span>
                          </button>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <Form {...asaasForm}>
                        <form onSubmit={asaasForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
                          <FormField
                            control={asaasForm.control}
                            name="apiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key</FormLabel>
                                <FormControl>
                                  <Input placeholder="API Key da Asaas" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Encontre no painel da Asaas em Configurações {">"} API
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={asaasForm.control}
                            name="sandbox"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Modo Sandbox</FormLabel>
                                  <FormDescription>
                                    Usar ambiente de teste (sandbox) da Asaas
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => setIsAddingGateway(false)}
                            >
                              Cancelar
                            </Button>
                            <Button type="submit">
                              Salvar
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64 col-span-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  !Array.isArray(channels) || channels.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200 col-span-2">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum gateway de pagamento configurado</h3>
                      <p className="text-gray-500 mb-4">
                        Adicione gateways de pagamento para processar cobranças.
                      </p>
                      <Button
                        onClick={() => setIsAddingGateway(true)}
                      >
                        Adicionar Gateway
                      </Button>
                    </div>
                  ) : (
                    Array.isArray(channels) && channels.filter(channel => channel.type === "asaas").map((channel) => (
                      <Card key={channel.id}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <DollarSign className="h-5 w-5 text-blue-500" />
                              <CardTitle className="ml-2">{channel.name}</CardTitle>
                            </div>
                            <Switch
                              checked={channel.isActive}
                              // In a real app, this would call an API to update the channel status
                            />
                          </div>
                          <CardDescription>
                            Asaas - Processamento de pagamentos
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">
                            Integração para geração de cobranças e processamento de pagamentos
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="w-full">
                            Configurar
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )
                )}
              </div>
            </TabsContent>

          <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Perfil do Usuário</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                      <button className="absolute bottom-0 right-0 bg-primary-500 text-white p-1 rounded-full">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Nome do Usuário</h3>
                      <p className="text-sm text-gray-500">usuario@exemplo.com</p>
                      <p className="text-sm text-gray-500">Administrador</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Nome</label>
                        <Input id="name" defaultValue="Nome do Usuário" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <Input id="email" defaultValue="usuario@exemplo.com" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="bio" className="text-sm font-medium">Biografia</label>
                      <Textarea
                        id="bio"
                        placeholder="Conte um pouco sobre você..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end space-x-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button>Salvar</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Segurança</CardTitle>
                  <CardDescription>
                    Gerencie sua senha e segurança da conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="current-password" className="text-sm font-medium">Senha Atual</label>
                    <Input id="current-password" type="password" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="text-sm font-medium">Nova Senha</label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className="text-sm font-medium">Confirmar Senha</label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-4">
                    <Lock className="h-5 w-5 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      Sua senha deve ter pelo menos 8 caracteres e incluir letras, números e caracteres especiais.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="justify-end space-x-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button>Atualizar Senha</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
          <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Configurações gerais da aplicação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Notificações no Navegador</p>
                        <p className="text-xs text-gray-500">
                          Receba notificações no navegador quando uma nova mensagem chegar
                        </p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Idioma</p>
                        <p className="text-xs text-gray-500">
                          Selecione o idioma da interface
                        </p>
                      </div>
                    </div>
                    <select
                      className="w-32 p-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      defaultValue="pt-BR"
                    >
                      <option value="pt-BR">Português</option>
                      <option value="en-US">English</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Fuso Horário</p>
                        <p className="text-xs text-gray-500">
                          Configure o fuso horário para exibição de datas
                        </p>
                      </div>
                    </div>
                    <select
                      className="w-64 p-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      defaultValue="America/Sao_Paulo"
                    >
                      <option value="America/Sao_Paulo">
                        America/Sao_Paulo (GMT-03:00)
                      </option>
                      <option value="America/Fortaleza">
                        America/Fortaleza (GMT-03:00)
                      </option>
                      <option value="America/Manaus">
                        America/Manaus (GMT-04:00)
                      </option>
                      <option value="America/Rio_Branco">
                        America/Rio_Branco (GMT-05:00)
                      </option>
                    </select>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Tempo Limite de Inatividade</p>
                        <p className="text-xs text-gray-500">
                          Tempo em minutos antes de marcar um usuário como ausente
                        </p>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      defaultValue="15"
                      className="w-24"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-end space-x-2">
                  <Button variant="outline">Restaurar Padrões</Button>
                  <Button>Salvar</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>
                    URLs para receber eventos da plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="webhook-url" className="text-sm font-medium">URL do Webhook</label>
                    <Input
                      id="webhook-url"
                      placeholder="https://seu-servidor.com/webhook"
                    />
                    <p className="text-xs text-gray-500">
                      URL para onde enviaremos eventos como novas mensagens, mudanças de status, etc.
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-2">Eventos para notificar</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="event-new-message" />
                        <label
                          htmlFor="event-new-message"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Nova mensagem
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch id="event-status-change" />
                        <label
                          htmlFor="event-status-change"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Mudança de status
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch id="event-assignment" />
                        <label
                          htmlFor="event-assignment"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Atribuição de conversa
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch id="event-payment" />
                        <label
                          htmlFor="event-payment"
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Eventos de pagamento
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end space-x-2">
                  <Button variant="outline">Testar Webhook</Button>
                  <Button>Salvar</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
          <TabsContent value="ai" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Fontes de Dados para IA</h2>
                <Dialog open={isAddingDataSource} onOpenChange={setIsAddingDataSource}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Fonte de Dados
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Fonte de Dados</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova fonte de dados para treinar seu assistente de IA.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      {getDataSourceForm()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {isLoadingAiSources ? (
                  <div className="flex justify-center items-center h-64 col-span-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : !Array.isArray(aiDataSources) || aiDataSources.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200 col-span-2">
                    <DatabaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma fonte de dados configurada</h3>
                    <p className="text-gray-500 mb-4">
                      Adicione fontes de dados para treinar sua IA com conhecimento específico.
                    </p>
                    <Button
                      onClick={() => setIsAddingDataSource(true)}
                    >
                      Adicionar Fonte de Dados
                    </Button>
                  </div>
                ) : (
                  Array.isArray(aiDataSources) && aiDataSources.map((source: any) => (
                    <Card key={source.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            {source.type === 'document' && <FileText className="h-5 w-5 text-blue-500" />}
                            {source.type === 'website' && <Globe className="h-5 w-5 text-green-500" />}
                            {source.type === 'api' && <Laptop className="h-5 w-5 text-purple-500" />}
                            {source.type === 'qa_pairs' && <HelpCircle className="h-5 w-5 text-orange-500" />}
                            <CardTitle className="ml-2">{source.name}</CardTitle>
                          </div>
                          <Switch
                            checked={source.isActive}
                            // In a real app, this would call an API to update the source status
                          />
                        </div>
                        <CardDescription>
                          {source.description || `Fonte de dados do tipo ${source.type}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="text-sm">
                          {source.type === 'website' && (
                            <p className="text-gray-500">URL: {source.url}</p>
                          )}
                          {source.type === 'document' && source.content && (
                            <div>
                              <p className="text-gray-500 mb-1">Conteúdo:</p>
                              <div className="bg-gray-50 p-2 rounded-md text-xs text-gray-700 max-h-24 overflow-hidden">
                                {source.content.substring(0, 150)}...
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
              
              <div className="mt-10 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800">Pares de Perguntas e Respostas</h2>
                <Dialog open={isAddingQaPair} onOpenChange={setIsAddingQaPair}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Pergunta/Resposta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Par de Pergunta e Resposta</DialogTitle>
                      <DialogDescription>
                        Adicione perguntas e respostas específicas para treinar seu assistente de IA.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      {getQaPairForm()}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {isLoadingQaPairs ? (
                  <div className="flex justify-center items-center h-64 col-span-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : !Array.isArray(aiQaPairs) || aiQaPairs.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200 col-span-2">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum par de pergunta/resposta configurado</h3>
                    <p className="text-gray-500 mb-4">
                      Adicione pares de perguntas e respostas para treinar sua IA com informações específicas.
                    </p>
                    <Button
                      onClick={() => setIsAddingQaPair(true)}
                    >
                      Adicionar Pergunta/Resposta
                    </Button>
                  </div>
                ) : (
                  Array.isArray(aiQaPairs) && aiQaPairs.map((pair: any) => (
                    <Card key={pair.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <HelpCircle className="h-5 w-5 text-primary-500" />
                            <CardTitle className="ml-2">Pergunta</CardTitle>
                          </div>
                        </div>
                        <CardDescription>
                          {pair.question}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center mb-1">
                          <AlertCircle className="h-5 w-5 text-blue-500" />
                          <p className="ml-2 font-medium">Resposta:</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                          {pair.answer}
                        </div>
                        {pair.sourceId && (
                          <p className="text-xs text-gray-500 mt-2">
                            Associado à fonte: {Array.isArray(aiDataSources) && aiDataSources.find(s => s.id === pair.sourceId)?.name || `ID ${pair.sourceId}`}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </AppShell>
  );
}