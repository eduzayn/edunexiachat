/**
 * Servidor de teste para Socket.IO
 * 
 * Este script inicia um servidor Express mínimo para testar a implementação
 * Socket.IO consolidada.
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Implementação simplificada do serviço WebSocket
function setupSimpleSocketIO(httpServer) {
  const io = new Server(httpServer);
  
  io.on('connection', (socket) => {
    console.log('Um cliente se conectou');
    
    socket.on('echo', (data) => {
      console.log('Eco recebido:', data);
      socket.emit('echo', { 
        message: `Echo: ${data.message || 'sem mensagem'}`,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('typing:start', (data) => {
      console.log('Usuário começou a digitar:', data);
      socket.broadcast.emit('typing:update', {
        conversationId: data.conversationId,
        users: [{ userId: socket.id, displayName: data.displayName || 'Usuário' }]
      });
    });
    
    socket.on('typing:stop', (data) => {
      console.log('Usuário parou de digitar:', data);
      socket.broadcast.emit('typing:update', {
        conversationId: data.conversationId,
        users: []
      });
    });
    
    socket.on('presence:update', (data) => {
      console.log('Atualização de presença:', data);
      io.emit('presence:update', {
        userId: socket.id,
        status: data.status,
        displayName: data.displayName || 'Usuário'
      });
    });
    
    socket.on('disconnect', () => {
      console.log('Um cliente se desconectou');
    });
  });
  
  return { io };
}

// Cria aplicação Express
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

// Configura rotas básicas
app.get('/', (req, res) => {
  // Envia uma página HTML simples para teste
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste de Socket.IO</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .status { margin-bottom: 10px; }
    .connected { color: green; }
    .disconnected { color: red; }
    .message-list { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
    .form-control { display: flex; margin-bottom: 10px; }
    .form-control input { flex: 1; padding: 8px; }
    .form-control button { padding: 8px 16px; margin-left: 10px; }
    .presence { display: flex; gap: 10px; margin-bottom: 10px; }
    .presence button { padding: 8px 16px; }
    .typing { font-style: italic; color: #666; height: 20px; }
  </style>
</head>
<body>
  <h1>Teste de Socket.IO</h1>
  
  <div class="status">
    Status: <span id="connection-status" class="disconnected">Desconectado</span>
  </div>
  
  <div class="presence">
    <button id="btn-online">Online</button>
    <button id="btn-away">Ausente</button>
    <button id="btn-offline">Offline</button>
  </div>
  
  <div class="message-list" id="message-list"></div>
  
  <div class="typing" id="typing-indicator"></div>
  
  <div class="form-control">
    <input type="text" id="message-input" placeholder="Digite uma mensagem...">
    <button id="send-btn">Enviar</button>
  </div>
  
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Elementos do DOM
    const statusEl = document.getElementById('connection-status');
    const messageListEl = document.getElementById('message-list');
    const messageInputEl = document.getElementById('message-input');
    const sendBtnEl = document.getElementById('send-btn');
    const typingIndicatorEl = document.getElementById('typing-indicator');
    const btnOnline = document.getElementById('btn-online');
    const btnAway = document.getElementById('btn-away');
    const btnOffline = document.getElementById('btn-offline');
    
    // Configuração do Socket.IO
    const socket = io();
    const conversationId = 1;
    const userName = 'Usuário Teste';
    let typingTimeout;
    
    // Funções auxiliares
    function addMessage(message) {
      const messageEl = document.createElement('div');
      messageEl.style.marginBottom = '8px';
      messageEl.style.padding = '8px';
      messageEl.style.background = '#f1f1f1';
      messageEl.style.borderRadius = '4px';
      messageEl.innerHTML = message;
      messageListEl.appendChild(messageEl);
      messageListEl.scrollTop = messageListEl.scrollHeight;
    }
    
    // Eventos do Socket.IO
    socket.on('connect', () => {
      statusEl.textContent = 'Conectado';
      statusEl.className = 'connected';
      addMessage('<strong>Sistema:</strong> Conectado ao servidor');
    });
    
    socket.on('disconnect', () => {
      statusEl.textContent = 'Desconectado';
      statusEl.className = 'disconnected';
      addMessage('<strong>Sistema:</strong> Desconectado do servidor');
    });
    
    socket.on('echo', (data) => {
      addMessage(\`<strong>Eco recebido:</strong> \${data.message}\`);
    });
    
    socket.on('typing:update', (data) => {
      if (data.users && data.users.length > 0) {
        const names = data.users.map(u => u.displayName).join(', ');
        typingIndicatorEl.textContent = \`\${names} está(ão) digitando...\`;
      } else {
        typingIndicatorEl.textContent = '';
      }
    });
    
    socket.on('presence:update', (data) => {
      addMessage(\`<strong>Presença:</strong> \${data.displayName} está \${data.status}\`);
    });
    
    // Eventos de UI
    messageInputEl.addEventListener('input', () => {
      clearTimeout(typingTimeout);
      socket.emit('typing:start', { conversationId, displayName: userName });
      
      typingTimeout = setTimeout(() => {
        socket.emit('typing:stop', { conversationId });
      }, 2000);
    });
    
    messageInputEl.addEventListener('blur', () => {
      socket.emit('typing:stop', { conversationId });
    });
    
    sendBtnEl.addEventListener('click', () => {
      const message = messageInputEl.value.trim();
      if (message) {
        socket.emit('echo', { message });
        addMessage(\`<strong>Você:</strong> \${message}\`);
        messageInputEl.value = '';
        socket.emit('typing:stop', { conversationId });
      }
    });
    
    messageInputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendBtnEl.click();
      }
    });
    
    btnOnline.addEventListener('click', () => {
      socket.emit('presence:update', { status: 'online', displayName: userName });
    });
    
    btnAway.addEventListener('click', () => {
      socket.emit('presence:update', { status: 'away', displayName: userName });
    });
    
    btnOffline.addEventListener('click', () => {
      socket.emit('presence:update', { status: 'offline', displayName: userName });
    });
  </script>
</body>
</html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configura WebSocket/Socket.IO
const socketServer = setupSimpleSocketIO(httpServer);

// Inicia o servidor
httpServer.listen(port, () => {
  console.log(`Servidor de teste Socket.IO rodando na porta ${port}`);
  console.log(`Abra http://localhost:${port} para verificar o status`);
});

// Manipula encerramento
process.on('SIGINT', () => {
  console.log('Encerrando servidor...');
  httpServer.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});