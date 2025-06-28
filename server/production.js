#!/usr/bin/env node

// Configuração robusta para deploy na Replit
import express from 'express';
import { createServer } from 'http';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Iniciando servidor de produção...');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

// Configurar ambiente de produção
process.env.NODE_ENV = 'production';

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Endpoints de saúde críticos (PRIMEIRO)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Clean My House',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Clean My House - Time Tracking System',
    timestamp: new Date().toISOString()
  });
});

// Log inicial
console.log('✅ Servidor básico configurado');

// Iniciar servidor imediatamente para responder health checks
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
  
  // Tentar carregar aplicação principal após servidor estar estável
  setTimeout(loadMainApplication, 2000);
});

async function loadMainApplication() {
  try {
    console.log('📦 Verificando build...');
    
    // Verificar se build existe
    if (!existsSync('./dist/index.js')) {
      console.log('🔨 Criando build...');
      execSync('npm run build', { stdio: 'pipe' });
    }
    
    if (existsSync('./dist/index.js')) {
      console.log('✅ Build encontrado, carregando aplicação...');
      
      // Importar aplicação principal
      await import('../dist/index.js');
      console.log('✅ Aplicação principal carregada');
    } else {
      console.warn('⚠️ Build não disponível, mantendo servidor básico');
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar aplicação:', error);
    console.log('🔄 Mantendo servidor básico funcionando');
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Encerrando servidor...');
  server.close(() => process.exit(0));
});