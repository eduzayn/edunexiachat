/**
 * Serviço de backup para a aplicação
 *
 * Este arquivo fornece funcionalidades para realizar e gerenciar backups
 * dos dados da aplicação, incluindo banco de dados e arquivos de configuração.
 */
export interface BackupInfo {
    id: string;
    timestamp: Date;
    size: number;
    name: string;
    metadata?: any;
}
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
export declare class BackupService {
    private status;
    private backupTimer;
    constructor();
    /**
     * Atualiza as informações de status do serviço
     */
    refreshStatus(): Promise<BackupStatus>;
    /**
     * Agenda o próximo backup automático
     */
    scheduleNextBackup(): void;
    /**
     * Cria um novo backup completo do sistema
     * @param name Nome personalizado para o backup (opcional)
     * @param metadata Metadados adicionais para o backup (opcional)
     * @returns Informações sobre o backup criado
     */
    createBackup(name?: string, metadata?: any): Promise<BackupInfo>;
    /**
     * Obtém a lista de todos os backups disponíveis
     * @returns Array com informações de todos os backups
     */
    getBackups(): Promise<BackupInfo[]>;
    /**
     * Restaura um backup a partir do seu ID
     * @param id ID do backup a ser restaurado
     * @returns true se a restauração foi bem-sucedida
     */
    restoreBackup(id: string): Promise<boolean>;
    /**
     * Remove um backup pelo ID
     * @param id ID do backup a ser removido
     * @returns true se o backup foi removido com sucesso
     */
    deleteBackup(id: string): Promise<boolean>;
    /**
     * Obtém o status atual do sistema de backup
     * @returns Informações sobre o estado atual do backup
     */
    getStatus(): BackupStatus;
    /**
     * Habilita ou desabilita os backups automáticos
     * @param enabled true para habilitar, false para desabilitar
     */
    setEnabled(enabled: boolean): void;
    /**
     * Define o intervalo entre backups automáticos
     * @param intervalMs Intervalo em milissegundos
     */
    setBackupInterval(intervalMs: number): void;
}
export declare const backupService: BackupService;
