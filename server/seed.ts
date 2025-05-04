import { db } from "./db";
import { users, messageTemplates, agentPerformance, satisfactionSurveys } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq, sql } from "drizzle-orm";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function ensureTablesExist() {
  console.log("🔍 Verificando estrutura do banco de dados...");
  
  try {
    // Verificar se a tabela message_templates existe
    const messageTemplatesResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'message_templates'
      );
    `);
    
    const messageTemplatesExists = messageTemplatesResult.rows[0].exists;
    
    if (!messageTemplatesExists) {
      console.log("📦 Criando tabela message_templates...");
      
      // Criar a tabela message_templates usando SQL direto
      await pool.query(`
        CREATE TABLE message_templates (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          description TEXT,
          category TEXT,
          tags TEXT[],
          channel_id INTEGER REFERENCES channels(id),
          created_by INTEGER REFERENCES users(id),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          usage_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      console.log("✅ Tabela message_templates criada com sucesso!");
    } else {
      console.log("ℹ️ Tabela message_templates já existe.");
    }
    
    // Verificar se a tabela agent_performance existe
    const agentPerformanceResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'agent_performance'
      );
    `);
    
    const agentPerformanceExists = agentPerformanceResult.rows[0].exists;
    
    if (!agentPerformanceExists) {
      console.log("📦 Criando tabela agent_performance...");
      
      // Criar a tabela agent_performance usando SQL direto
      await pool.query(`
        CREATE TABLE agent_performance (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          average_response_time_ms INTEGER,
          average_first_response_time_ms INTEGER,
          average_resolution_time_ms INTEGER,
          messages_count INTEGER NOT NULL DEFAULT 0,
          conversations_count INTEGER NOT NULL DEFAULT 0,
          resolved_conversations_count INTEGER NOT NULL DEFAULT 0,
          csat INTEGER,
          csat_response_count INTEGER NOT NULL DEFAULT 0,
          transfer_rate INTEGER,
          handle_time_ms INTEGER,
          online_time_ms INTEGER NOT NULL DEFAULT 0,
          busy_time_ms INTEGER NOT NULL DEFAULT 0,
          away_time_ms INTEGER NOT NULL DEFAULT 0,
          utilization_rate INTEGER,
          date DATE NOT NULL,
          week_number INTEGER,
          month_number INTEGER,
          year INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          
          CONSTRAINT agent_performance_user_date_unique UNIQUE (user_id, date)
        );
        
        -- Criar índices para melhorar performance de consultas
        CREATE INDEX agent_performance_user_date_idx ON agent_performance(user_id, date);
        CREATE INDEX agent_performance_date_idx ON agent_performance(date);
      `);
      
      console.log("✅ Tabela agent_performance criada com sucesso!");
    } else {
      console.log("ℹ️ Tabela agent_performance já existe.");
    }
    
    // Verificar se a tabela satisfaction_surveys existe
    const satisfactionSurveysResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'satisfaction_surveys'
      );
    `);
    
    const satisfactionSurveysExists = satisfactionSurveysResult.rows[0].exists;
    
    if (!satisfactionSurveysExists) {
      console.log("📦 Criando tabela satisfaction_surveys...");
      
      // Criar a tabela satisfaction_surveys usando SQL direto
      await pool.query(`
        CREATE TABLE satisfaction_surveys (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id),
          user_id INTEGER REFERENCES users(id),
          contact_id INTEGER NOT NULL REFERENCES contacts(id),
          score INTEGER NOT NULL,
          feedback TEXT,
          survey_type TEXT NOT NULL DEFAULT 'csat',
          survey_data JSONB,
          source TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        -- Criar índices para melhorar performance de consultas
        CREATE INDEX satisfaction_surveys_conversation_idx ON satisfaction_surveys(conversation_id);
        CREATE INDEX satisfaction_surveys_user_idx ON satisfaction_surveys(user_id);
        CREATE INDEX satisfaction_surveys_contact_idx ON satisfaction_surveys(contact_id);
      `);
      
      console.log("✅ Tabela satisfaction_surveys criada com sucesso!");
    } else {
      console.log("ℹ️ Tabela satisfaction_surveys já existe.");
    }
  } catch (error) {
    console.error("❌ Erro ao verificar/criar tabelas:", error);
  }
}

async function seedDatabase() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Garantir que todas as tabelas necessárias existam
  await ensureTablesExist();

  // Verificar se já existe um usuário admin
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
  
  if (existingAdmin.length === 0) {
    // Criar usuário admin padrão
    await db.insert(users).values({
      username: "admin",
      password: await hashPassword("senha123"),
      name: "Administrador",
      email: "admin@educhat.com.br",
    });
    console.log("✅ Usuário admin criado com sucesso!");
  } else {
    console.log("ℹ️ Usuário admin já existe, pulando criação.");
  }

  console.log("✅ Seed concluído com sucesso!");
}

// A função seedDatabase será chamada diretamente pelo server/index.ts

export default seedDatabase;