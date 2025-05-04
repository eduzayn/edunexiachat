/**
 * Servidor Express para a aplicação EduChatConnect
 * 
 * Este arquivo inicia um servidor Express que serve os arquivos estáticos
 * e lida com as requisições API da aplicação.
 */

// Importações necessárias
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setupRoutes } from './routes.js';
import { memStorage } from './storage';

// Cria uma instância do Express
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const apiRouter = express.Router();

// Determina o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Aplica patch DOM para corrigir problemas React
try {
  import('../src/dom-patch.js').catch(err => {
    console.log('DOM patch não carregado (esperado em produção):', err.message);
  });
} catch (err) {
  console.log('DOM patch não disponível (esperado em produção)');
}

// Middleware para logs de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Verifica se o diretório public existe
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Se não existir, cria um arquivo index.html mínimo
  if (!fs.existsSync(path.join(publicDir, 'index.html'))) {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EduChatConnect</title>
  <script>
    // Patch para corrigir erro "NotFoundError: Failed to execute 'removeChild' on 'Node'"
    (function() {
      console.log('Aplicando patch de segurança para operações DOM...');
      
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function(child) {
        try {
          return originalRemoveChild.call(this, child);
        } catch (error) {
          if (error instanceof DOMException && 
              (error.name === 'NotFoundError' || error.message.includes('not a child'))) {
            console.warn('Prevented NotFoundError in removeChild');
            return child;
          }
          throw error;
        }
      };
      
      console.log('Patches aplicados com sucesso');
    })();
  </script>
</head>
<body>
  <div id="root">
    <h1>EduChatConnect</h1>
    <p>Aplicação em carregamento...</p>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);
    console.log('Arquivo index.html criado no diretório public');
  }
}

// Serve arquivos estáticos da pasta public
app.use(express.static(publicDir));

// Middleware para processar JSON
app.use(express.json());

// Configura as rotas da API
setupRoutes(apiRouter, memStorage);
app.use('/api', apiRouter);

// Middleware para tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro na aplicação:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Erro interno do servidor',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Health check endpoint for deployments
app.get('/', (req, res) => {
  res.status(200).send('Health check OK');
});

// Qualquer outra rota redireciona para o index.html
app.get('*', (req, res) => {
  if (req.path !== '/') {
    res.sendFile(path.join(publicDir, 'index.html'));
  }
});

// Inicia o servidor na porta especificada (0.0.0.0 para permitir acesso externo)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor EduChatConnect em execução na porta ${PORT}`);
  console.log(`http://0.0.0.0:${PORT}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
});