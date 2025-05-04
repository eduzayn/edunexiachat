
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const isProduction = process.env.NODE_ENV === 'production';
const distServerPath = './dist/server/index.js';

console.log(`Starting server in ${isProduction ? 'production' : 'development'} mode`);

const startServer = async () => {
  try {
    // First method: try to use compiled code in production
    if (isProduction && fs.existsSync(distServerPath)) {
      console.log('Starting server from compiled files...');
      
      // Import the server module
      import(distServerPath)
        .then(module => {
          if (typeof module.default === 'function') {
            module.default();
          } else {
            console.log('Server started via import');
          }
        })
        .catch(err => {
          console.error('Error importing server:', err);
          fallbackToTsx();
        });
    } else {
      fallbackToTsx();
    }
  } catch (error) {
    console.error('Server start failed:', error);
    process.exit(1);
  }
};

const fallbackToTsx = () => {
  console.log('Falling back to tsx for TypeScript execution...');
  
  const tsNodeProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true
  });
  
  tsNodeProcess.on('error', (error) => {
    console.error('Error starting tsx process:', error);
  });
  
  process.on('SIGINT', () => {
    tsNodeProcess.kill('SIGINT');
    process.exit(0);
  });
};

// Start the server
startServer();
