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
import { setupRoutes } from './routes';
import { memStorage } from './storage';
// Cria uma instância do Express
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
var apiRouter = express.Router();
// Determina o diretório atual
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var rootDir = path.resolve(__dirname, '..');
var publicDir = path.join(rootDir, 'public');
// Aplica patch DOM para corrigir problemas React
import '../src/dom-patch.js';
// Middleware para logs de requisições
app.use(function (req, res, next) {
    console.log("[".concat(new Date().toISOString(), "] ").concat(req.method, " ").concat(req.url));
    next();
});
// Verifica se o diretório public existe
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    // Se não existir, cria um arquivo index.html mínimo
    if (!fs.existsSync(path.join(publicDir, 'index.html'))) {
        var htmlContent = "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>EduChatConnect</title>\n  <script>\n    // Patch para corrigir erro \"NotFoundError: Failed to execute 'removeChild' on 'Node'\"\n    (function() {\n      console.log('Aplicando patch de seguran\u00E7a para opera\u00E7\u00F5es DOM...');\n      \n      const originalRemoveChild = Node.prototype.removeChild;\n      Node.prototype.removeChild = function(child) {\n        try {\n          return originalRemoveChild.call(this, child);\n        } catch (error) {\n          if (error instanceof DOMException && \n              (error.name === 'NotFoundError' || error.message.includes('not a child'))) {\n            console.warn('Prevented NotFoundError in removeChild');\n            return child;\n          }\n          throw error;\n        }\n      };\n      \n      console.log('Patches aplicados com sucesso');\n    })();\n  </script>\n</head>\n<body>\n  <div id=\"root\">\n    <h1>EduChatConnect</h1>\n    <p>Aplica\u00E7\u00E3o em carregamento...</p>\n  </div>\n  <script type=\"module\" src=\"/src/main.tsx\"></script>\n</body>\n</html>";
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
app.use(function (err, req, res, next) {
    console.error('Erro na aplicação:', err);
    res.status(err.statusCode || 500).json({
        error: err.message || 'Erro interno do servidor',
        code: err.code || 'INTERNAL_ERROR'
    });
});
// Health check endpoint for deployments
app.get('/', function (req, res) {
    res.status(200).send('Health check OK');
});
// Qualquer outra rota redireciona para o index.html
app.get('*', function (req, res) {
    if (req.path !== '/') {
        res.sendFile(path.join(publicDir, 'index.html'));
    }
});
// Inicia o servidor na porta especificada (0.0.0.0 para permitir acesso externo)
var server = app.listen(PORT, '0.0.0.0', function () {
    console.log("Servidor EduChatConnect em execu\u00E7\u00E3o na porta ".concat(PORT));
    console.log("http://0.0.0.0:".concat(PORT));
});
// Tratamento de erros não capturados
process.on('uncaughtException', function (error) {
    console.error('Erro não capturado:', error);
});
process.on('unhandledRejection', function (reason, promise) {
    console.error('Promessa rejeitada não tratada:', reason);
});
