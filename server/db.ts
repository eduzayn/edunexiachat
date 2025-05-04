/**
 * Configuração e conexão com banco de dados PostgreSQL
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import createLogger from "./utils/logger";

const logger = createLogger("database");

// Obter URL de conexão da variável de ambiente
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error("DATABASE_URL não configurada");
  throw new Error("Variável de ambiente DATABASE_URL não configurada");
}

// Configuração do pool de conexões
const pool = new Pool({
  connectionString,
  max: 10, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo máximo de inatividade
  connectionTimeoutMillis: 5000, // Tempo máximo para conexão
});

// Eventos do pool
pool.on("connect", () => {
  logger.debug("Nova conexão ao banco de dados estabelecida");
});

pool.on("error", (err) => {
  logger.error("Erro no pool de conexão PostgreSQL", { error: err });
});

// Inicialização do Drizzle ORM
export const db = drizzle(pool, { schema });

// Função para teste de conexão
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      logger.info("Conexão com banco de dados testada com sucesso");
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Falha ao testar conexão com banco de dados", { error });
    return false;
  }
}

// Função para encerramento limpo da conexão
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info("Conexão com banco de dados encerrada");
  } catch (error) {
    logger.error("Erro ao encerrar conexão com banco de dados", { error });
  }
}