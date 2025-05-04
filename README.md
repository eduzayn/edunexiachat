# EduChat - Plataforma de Comunicação Omnichannel

EduChat é uma plataforma avançada de comunicação omnichannel projetada para gerenciar conversas através de múltiplos canais de forma unificada. O sistema oferece uma interface intuitiva em português do Brasil, com suporte para múltiplos idiomas.

## Recursos Principais

- **Comunicação Omnichannel**: Integração com múltiplos canais de comunicação como WhatsApp, Messenger, Instagram, Telegram, SMS, Email, Slack, Discord e outros.
- **Gestão de Conversas**: Interface unificada para gerenciar todas as conversas independentemente do canal de origem.
- **Gestão de Contatos**: Cadastro e gerenciamento centralizado de contatos com histórico de interações.
- **Internacionalização**: Suporte para múltiplos idiomas, com interface principal em português do Brasil.
- **Pagamentos Integrados**: Processamento de pagamentos via integração com Asaas.
- **Escalabilidade**: Arquitetura modular que permite adicionar novos canais facilmente.

## Canais de Comunicação Suportados

- **WhatsApp**: Via Twilio e ZapAPI
- **Facebook Messenger**: Integração com a API do Meta
- **Instagram**: Integração com a API do Meta
- **SMS**: Via Twilio
- **Email**: Via SendGrid
- **Telegram**: Via API do Telegram Bot
- **Slack**: Via API do Slack
- **Discord**: Via Discord.js

## Requisitos Técnicos

- Node.js
- PostgreSQL
- API keys para os canais desejados

## Variáveis de Ambiente

Para utilizar as integrações com canais externos, configure as seguintes variáveis de ambiente:

### Autenticação e Banco de Dados
- `DATABASE_URL`: URL de conexão com o PostgreSQL
- `SESSION_SECRET`: Chave secreta para as sessões

### WhatsApp e SMS (Twilio)
- `TWILIO_ACCOUNT_SID`: SID da conta Twilio
- `TWILIO_AUTH_TOKEN`: Token de autenticação Twilio
- `TWILIO_PHONE_NUMBER`: Número de telefone WhatsApp da Twilio
- `TWILIO_SMS_NUMBER`: Número de telefone SMS da Twilio

### WhatsApp (ZapAPI)
- `ZAPAPI_TOKEN`: Token de acesso da ZapAPI
- `ZAPAPI_INSTANCE`: ID da instância na ZapAPI

### Meta Platforms (Facebook, Instagram)
- `META_APP_ID`: ID da aplicação Meta
- `META_APP_SECRET`: Segredo da aplicação Meta
- `META_PAGE_TOKEN`: Token de acesso da página
- `META_WEBHOOK_VERIFY_TOKEN`: Token de verificação do webhook Meta

### Telegram
- `TELEGRAM_BOT_TOKEN`: Token do bot Telegram

### Email (SendGrid)
- `SENDGRID_API_KEY`: Chave de API do SendGrid
- `SENDGRID_FROM_EMAIL`: Email de remetente para mensagens SendGrid

### Slack
- `SLACK_BOT_TOKEN`: Token do bot Slack
- `SLACK_CHANNEL_ID`: ID do canal padrão do Slack

### Discord
- `DISCORD_BOT_TOKEN`: Token do bot Discord
- `DISCORD_CHANNEL_ID`: ID do canal padrão do Discord

### Asaas (Pagamentos)
- `ASAAS_API_KEY`: Chave de API do Asaas
- `ASAAS_ENVIRONMENT`: Ambiente Asaas ('sandbox' ou 'production')

## Instalação

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente (veja acima)
4. Execute as migrações do banco de dados: `npm run db:push`
5. Inicie o servidor: `npm run dev`

## Uso Básico da API

### Autenticação

```bash
# Registrar um novo usuário
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha123","name":"Administrador","email":"admin@example.com"}'

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha123"}'

# Obter usuário atual
curl -X GET http://localhost:5000/api/user \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>"

# Logout
curl -X POST http://localhost:5000/api/logout \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>"
```

### Canais

```bash
# Criar um novo canal de comunicação
curl -X POST http://localhost:5000/api/channels \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>" \
  -d '{
    "name": "WhatsApp Principal",
    "type": "whatsapp_twilio",
    "config": "{\"accountSid\":\"AC123\",\"authToken\":\"token123\",\"phoneNumber\":\"+5511999999999\"}",
    "isActive": true
  }'

# Listar todos os canais
curl -X GET http://localhost:5000/api/channels \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>"
```

### Contatos

```bash
# Criar um novo contato
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>" \
  -d '{
    "name": "João Silva",
    "phone": "+5511999999999",
    "email": "joao@example.com",
    "identifier": "+5511999999999",
    "source": "whatsapp_twilio",
    "company": "Empresa ABC",
    "position": "Gerente"
  }'

# Listar todos os contatos
curl -X GET http://localhost:5000/api/contacts \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>"
```

### Conversas

```bash
# Listar todas as conversas
curl -X GET http://localhost:5000/api/conversations \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>"

# Obter uma conversa específica com suas mensagens
curl -X GET http://localhost:5000/api/conversations/1 \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>"

# Enviar uma mensagem em uma conversa
curl -X POST http://localhost:5000/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>" \
  -d '{
    "content": "Olá, como posso ajudar?",
    "contentType": "text"
  }'

# Atribuir uma conversa a um usuário
curl -X POST http://localhost:5000/api/conversations/1/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<seu_cookie_de_sessao>" \
  -d '{
    "userId": 1
  }'
```

## Adicionando Novos Canais

O sistema foi projetado para facilitar a adição de novos canais de comunicação. Para adicionar um novo canal:

1. Crie um novo adaptador de canal em `server/channels` baseado no template em `server/adapters/template.ts`
2. Implemente os métodos `handleWebhook` e `sendMessage` conforme a API do canal
3. Registre o novo adaptador e suas rotas de webhook em `server/routes.ts`
4. Adicione o novo tipo de canal ao switch case para envio de mensagens

## Licença

© 2025 EduChat. Todos os direitos reservados.