/**
 * Ponto de entrada principal da aplicação React
 */

// Importa as inicializações e patches primeiro para garantir que sejam aplicados antes de qualquer renderização React
import './init';
import './dom-patch';

// Importações React necessárias
import React from 'react';
import ReactDOM from 'react-dom/client';

// Componente App principal (a ser criado ou importado)
const App = () => {
  return (
    <div className="app-container">
      <h1>EduChatConnect</h1>
      <p>Aplicação carregada com sucesso</p>
    </div>
  );
};

// Renderiza o aplicativo no elemento root
const rootElement = document.getElementById('root');

if (rootElement) {
  // Cria uma raiz React
  const root = ReactDOM.createRoot(rootElement);
  
  // Renderiza o App com StrictMode para detectar problemas potenciais
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Elemento root não encontrado!');
}

// Configura o Hot Module Replacement (HMR) para desenvolvimento
// @ts-ignore - Atributo 'hot' é adicionado pelo Vite em runtime
if (import.meta.hot) {
  // @ts-ignore - Chamada 'accept' é adicionada pelo Vite em runtime
  import.meta.hot.accept();
}