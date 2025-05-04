/**
 * Serviço de backup para a aplicação
 * 
 * Este arquivo fornece funcionalidades para realizar e gerenciar backups
 * dos dados da aplicação, incluindo banco de dados e arquivos de configuração.
 */

import { log } from './logger';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Diretório onde os backups são armazenados
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

// Interface para representar informações do backup
export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
  name: string;
  metadata?: any;
}

// Interface para status do sistema de backup
export interface BackupStatus {
  enabled: boolean;
  lastBackup: Date | null;
  nextScheduledBackup: Date | null;
  totalBackups: number;
  backupDir: string;
  diskSpaceUsed: number;
  autoBackupInterval: number;
}

/**
 * Classe que gerencia as operações de backup
 */
export class BackupService {
  private status: BackupStatus;
  private backupTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    // Garantir que o diretório de backup exista
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      log(`Diretório de backup criado: ${BACKUP_DIR}`, 'backup');
    }
    
    // Inicializar status
    this.status = {
      enabled: true,
      lastBackup: null,
      nextScheduledBackup: null,
      totalBackups: 0,
      backupDir: BACKUP_DIR,
      diskSpaceUsed: 0,
      autoBackupInterval: 24 * 60 * 60 * 1000 // 24 horas (em milissegundos)
    };
    
    // Carregar informações dos backups existentes
    this.refreshStatus();
    
    // Iniciar backups automáticos (se habilitados)
    this.scheduleNextBackup();
    
    log('Serviço de backup inicializado', 'backup');
  }
  
  /**
   * Atualiza as informações de status do serviço
   */
  async refreshStatus(): Promise<BackupStatus> {
    try {
      // Contar os backups existentes
      const files = fs.readdirSync(BACKUP_DIR);
      const backupFiles = files.filter(f => f.endsWith('.zip') || f.endsWith('.sql') || f.endsWith('.json'));
      
      this.status.totalBackups = backupFiles.length;
      
      // Calcular espaço em disco usado
      let totalSize = 0;
      for (const file of backupFiles) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
      this.status.diskSpaceUsed = totalSize;
      
      // Encontrar o backup mais recente
      if (backupFiles.length > 0) {
        let mostRecent = new Date(0);
        for (const file of backupFiles) {
          const filePath = path.join(BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime > mostRecent) {
            mostRecent = stats.mtime;
          }
        }
        this.status.lastBackup = mostRecent;
      }
      
      return { ...this.status };
    } catch (error) {
      log(`Erro ao atualizar status de backup: ${error}`, 'backup', 'error');
      return { ...this.status };
    }
  }
  
  /**
   * Agenda o próximo backup automático
   */
  scheduleNextBackup(): void {
    if (!this.status.enabled) {
      log('Backups automáticos estão desabilitados', 'backup');
      return;
    }
    
    // Limpar timer existente, se houver
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
    }
    
    // Calcular quando o próximo backup deve ocorrer
    const now = new Date();
    let nextBackupTime: Date;
    
    if (!this.status.lastBackup) {
      // Se nunca tiver feito backup, agendar para daqui a 1 hora
      nextBackupTime = new Date(now.getTime() + 60 * 60 * 1000);
    } else {
      // Caso contrário, usar o intervalo configurado
      const lastBackupTime = this.status.lastBackup.getTime();
      const nextTime = lastBackupTime + this.status.autoBackupInterval;
      
      if (nextTime <= now.getTime()) {
        // Se já estiver no passado, agendar para daqui a 5 minutos
        nextBackupTime = new Date(now.getTime() + 5 * 60 * 1000);
      } else {
        nextBackupTime = new Date(nextTime);
      }
    }
    
    // Atualizar próximo horário de backup
    this.status.nextScheduledBackup = nextBackupTime;
    
    // Calcular o tempo até o próximo backup
    const timeUntilBackup = nextBackupTime.getTime() - now.getTime();
    
    log(`Próximo backup automático agendado para ${nextBackupTime.toISOString()}`, 'backup');
    
    // Agendar o próximo backup
    this.backupTimer = setTimeout(() => this.createBackup(), timeUntilBackup);
  }
  
  /**
   * Cria um novo backup completo do sistema
   * @param name Nome personalizado para o backup (opcional)
   * @param metadata Metadados adicionais para o backup (opcional)
   * @returns Informações sobre o backup criado
   */
  async createBackup(name?: string, metadata?: any): Promise<BackupInfo> {
    try {
      // Gerar ID único para o backup (timestamp + hash aleatório)
      const timestamp = new Date();
      const id = `backup_${timestamp.getTime()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Nome personalizado ou timestamp formatado
      const backupName = name || `Backup ${timestamp.toISOString().replace(/[:.]/g, '-')}`;
      
      log(`Iniciando backup "${backupName}" (${id})...`, 'backup');
      
      // Criar diretório temporário para este backup
      const tempDir = path.join(BACKUP_DIR, `tmp_${id}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        // Criar arquivo de metadados
        const metadataFile = path.join(tempDir, 'metadata.json');
        fs.writeFileSync(metadataFile, JSON.stringify({
          id,
          name: backupName,
          timestamp: timestamp.toISOString(),
          metadata: metadata || {},
          version: process.env.npm_package_version || 'unknown',
          environment: process.env.NODE_ENV || 'development'
        }, null, 2));
        
        // Fazer backup do banco de dados (simulado - substitua pelo código real)
        // Na implementação real, aqui seria feito um dump do banco
        const dbBackupPath = path.join(tempDir, 'database.sql');
        fs.writeFileSync(dbBackupPath, `-- Backup do banco de dados (${timestamp.toISOString()})`);
        
        // Arquivar tudo em um único arquivo ZIP
        const backupFileName = `${id}.zip`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);
        
        // Usar utilitário zip para comprimir
        await execAsync(`cd "${tempDir}" && zip -r "${backupPath}" ./*`);
        
        // Remover diretório temporário
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        // Obter tamanho do arquivo final
        const stats = fs.statSync(backupPath);
        const size = stats.size;
        
        // Atualizar status
        this.status.lastBackup = timestamp;
        await this.refreshStatus();
        this.scheduleNextBackup();
        
        log(`Backup "${backupName}" criado com sucesso (${size} bytes)`, 'backup');
        
        return {
          id,
          timestamp,
          size,
          name: backupName,
          metadata: metadata || {}
        };
      } catch (error) {
        // Limpar em caso de erro
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
      }
    } catch (error) {
      log(`Erro ao criar backup: ${error}`, 'backup', 'error');
      throw new Error(`Falha ao criar backup: ${error}`);
    }
  }
  
  /**
   * Obtém a lista de todos os backups disponíveis
   * @returns Array com informações de todos os backups
   */
  async getBackups(): Promise<BackupInfo[]> {
    try {
      // Listar todos os arquivos no diretório de backup
      const files = fs.readdirSync(BACKUP_DIR);
      const backupFiles = files.filter(f => f.endsWith('.zip'));
      
      const backups: BackupInfo[] = [];
      
      // Processar cada arquivo
      for (const file of backupFiles) {
        try {
          // Extrair ID do nome do arquivo
          const id = file.replace('.zip', '');
          
          // Obter estatísticas do arquivo
          const filePath = path.join(BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          
          // Extrair metadata (simulado - em uma implementação real extrairia do ZIP)
          // Aqui assumimos que o ID contém o timestamp
          const timestampMatch = id.match(/backup_(\d+)_/);
          const timestamp = timestampMatch 
            ? new Date(parseInt(timestampMatch[1])) 
            : stats.mtime;
          
          backups.push({
            id,
            timestamp,
            size: stats.size,
            name: `Backup ${timestamp.toISOString()}`
          });
        } catch (error) {
          log(`Erro ao processar backup ${file}: ${error}`, 'backup', 'warn');
          // Continuar com o próximo arquivo
        }
      }
      
      // Ordenar por data (mais recente primeiro)
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return backups;
    } catch (error) {
      log(`Erro ao listar backups: ${error}`, 'backup', 'error');
      return [];
    }
  }
  
  /**
   * Restaura um backup a partir do seu ID
   * @param id ID do backup a ser restaurado
   * @returns true se a restauração foi bem-sucedida
   */
  async restoreBackup(id: string): Promise<boolean> {
    try {
      const backupPath = path.join(BACKUP_DIR, `${id}.zip`);
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup com ID ${id} não encontrado`);
      }
      
      log(`Iniciando restauração do backup ${id}...`, 'backup');
      
      // Criar diretório temporário para extração
      const tempDir = path.join(BACKUP_DIR, `restore_${id}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        // Extrair o arquivo ZIP
        await execAsync(`unzip -o "${backupPath}" -d "${tempDir}"`);
        
        // Aqui seria implementada a restauração real dos dados
        // Por exemplo, importar o arquivo SQL para o banco de dados
        // e copiar arquivos para os locais apropriados
        
        log(`Simulando restauração do banco de dados...`, 'backup');
        // await execAsync(`psql -f "${tempDir}/database.sql" ${process.env.DATABASE_URL}`);
        
        // Limpar diretório temporário
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        log(`Backup ${id} restaurado com sucesso`, 'backup');
        return true;
      } catch (error) {
        // Limpar em caso de erro
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
      }
    } catch (error) {
      log(`Erro ao restaurar backup ${id}: ${error}`, 'backup', 'error');
      throw new Error(`Falha ao restaurar backup: ${error}`);
    }
  }
  
  /**
   * Remove um backup pelo ID
   * @param id ID do backup a ser removido
   * @returns true se o backup foi removido com sucesso
   */
  async deleteBackup(id: string): Promise<boolean> {
    try {
      const backupPath = path.join(BACKUP_DIR, `${id}.zip`);
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup com ID ${id} não encontrado`);
      }
      
      // Remover o arquivo
      fs.unlinkSync(backupPath);
      
      // Atualizar status
      await this.refreshStatus();
      
      log(`Backup ${id} removido com sucesso`, 'backup');
      return true;
    } catch (error) {
      log(`Erro ao remover backup ${id}: ${error}`, 'backup', 'error');
      return false;
    }
  }
  
  /**
   * Obtém o status atual do sistema de backup
   * @returns Informações sobre o estado atual do backup
   */
  getStatus(): BackupStatus {
    return { ...this.status };
  }
  
  /**
   * Habilita ou desabilita os backups automáticos
   * @param enabled true para habilitar, false para desabilitar
   */
  setEnabled(enabled: boolean): void {
    this.status.enabled = enabled;
    
    if (enabled) {
      log('Backups automáticos habilitados', 'backup');
      this.scheduleNextBackup();
    } else {
      log('Backups automáticos desabilitados', 'backup');
      if (this.backupTimer) {
        clearTimeout(this.backupTimer);
        this.backupTimer = null;
      }
    }
  }
  
  /**
   * Define o intervalo entre backups automáticos
   * @param intervalMs Intervalo em milissegundos
   */
  setBackupInterval(intervalMs: number): void {
    if (intervalMs < 60000) { // Mínimo de 1 minuto
      intervalMs = 60000;
    }
    
    this.status.autoBackupInterval = intervalMs;
    log(`Intervalo de backup automático definido para ${intervalMs}ms`, 'backup');
    
    // Reagendar próximo backup
    if (this.status.enabled) {
      this.scheduleNextBackup();
    }
  }
}

// Exportar uma instância única do serviço de backup
export const backupService = new BackupService();