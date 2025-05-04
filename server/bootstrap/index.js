/**
 * Script de inicialização para facilitar o deploy
 * 
 * Este arquivo serve como ponto de entrada para o deploy no Replit.
 * Suporta tanto ambiente de desenvolvimento quanto produção.
 */

// Definir explicitamente NODE_ENV como produção para deploy
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Verificar o ambiente Node.js
console.log('Iniciando EduChatConnect...');
console.log(`Node.js versão: ${process.version}`);
console.log(`Ambiente: ${process.env.NODE_ENV}`);

// Definir caminho do servidor baseado no ambiente
let serverPath;

// Verificar se estamos em produção (deploy) ou desenvolvimento
if (process.env.NODE_ENV === 'production') {
  console.log('Executando em modo de produção');
  
  try {
    // Importar servidor diretamente via require
    // Isso é mais confiável para deploy que import()
    serverPath = './server/index.ts';
    
    // Verificar se temos a versão compilada
    const fs = require('fs');
    if (fs.existsSync('./dist/index.js')) {
      serverPath = './dist/index.js';
      console.log('Usando versão compilada do servidor');
      require(serverPath);
    } else {
      console.log('Versão compilada não encontrada, usando tsx');
      // Usar tsx para executar TypeScript diretamente
      require('child_process').spawn('npx', ['tsx', 'server/index.ts'], {
        stdio: 'inherit',
        shell: true
      });
    }
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err);
    
    // Tentar método alternativo com child_process
    console.log('Tentando método alternativo...');
    try {
      require('child_process').spawn('node', ['server/index.js'], {
        stdio: 'inherit',
        shell: true
      });
    } catch (fallbackErr) {
      console.error('Falha ao iniciar servidor com método alternativo:', fallbackErr);
      console.error('Por favor, verifique se o servidor está configurado corretamente');
    }
  }
} else {
  console.log('Executando em modo de desenvolvimento');
  
  // Em desenvolvimento, usar tsx
  try {
    require('child_process').spawn('npx', ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      shell: true
    });
  } catch (err) {
    console.error('Erro ao iniciar servidor em modo de desenvolvimento:', err);
    
    // Método alternativo
    console.log('Tentando método alternativo...');
    try {
      require('child_process').spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
      });
    } catch (fallbackErr) {
      console.error('Falha no método alternativo:', fallbackErr);
    }
  }
}