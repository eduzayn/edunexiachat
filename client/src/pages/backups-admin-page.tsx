import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Save, Info, ArrowDownCircle, Clock, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

// Tipos
interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size?: number;
  tables?: string[];
  duration?: number;
  compressionRatio?: number;
  error?: string;
  filename?: string;
}

interface BackupStatus {
  lastFullBackup: string | null;
  lastIncrementalBackup: string | null;
  nextScheduledBackup: string | null;
  nextBackupType: 'full' | 'incremental' | null;
  isBackupRunning: boolean;
  backupInProgress?: {
    id: string;
    type: 'full' | 'incremental';
    startTime: string;
    progress?: number;
  } | null;
  config: {
    fullBackupFrequency: number;
    incrementalBackupFrequency: number;
    retentionDays: number;
    compressBackups: boolean;
  };
}

// Formatar o tamanho do arquivo
function formatSize(bytes?: number): string {
  if (!bytes) return "Desconhecido";
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Componente para a página de administração de backups
export default function BackupsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // Consulta para obter a lista de backups
  const { 
    data: backups, 
    isLoading: isLoadingBackups, 
    refetch: refetchBackups
  } = useQuery<BackupMetadata[]>({
    queryKey: ['/api/backups'],
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
  
  // Consulta para obter o status do sistema de backup
  const { 
    data: backupStatus, 
    isLoading: isLoadingStatus, 
    refetch: refetchStatus
  } = useQuery<BackupStatus>({
    queryKey: ['/api/backups/status'],
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });
  
  // Mutação para criar um novo backup
  const createBackupMutation = useMutation({
    mutationFn: async (type: 'full' | 'incremental') => {
      const response = await apiRequest('POST', '/api/backups', { type });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup iniciado",
        description: "O processo de backup foi iniciado com sucesso.",
        variant: "default",
      });
      // Refetch data after initiating backup
      refetchBackups();
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar backup",
        description: error.message || "Não foi possível iniciar o backup. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  });
  
  // Mutação para restaurar um backup
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await apiRequest('POST', `/api/backups/${backupId}/restore`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Restauração iniciada",
        description: "O processo de restauração foi iniciado com sucesso.",
        variant: "default",
      });
      setConfirmDialogOpen(false);
      // Refetch data after initiating restore
      setTimeout(() => {
        refetchBackups();
        refetchStatus();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao restaurar backup",
        description: error.message || "Não foi possível restaurar o backup. Tente novamente mais tarde.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
    }
  });
  
  // Função para confirmar e iniciar a restauração
  const handleRestoreBackup = (backupId: string) => {
    setSelectedBackupId(backupId);
    setConfirmDialogOpen(true);
  };
  
  // Função para confirmar a restauração
  const confirmRestore = () => {
    if (selectedBackupId) {
      restoreBackupMutation.mutate(selectedBackupId);
    }
  };
  
  // Ordenar backups por timestamp em ordem decrescente
  const sortedBackups = backups 
    ? [...backups].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];
  
  // Filtrar backups por tipo
  const fullBackups = sortedBackups.filter(backup => backup.type === 'full');
  const incrementalBackups = sortedBackups.filter(backup => backup.type === 'incremental');
  
  // Formatar a data
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };
  
  // Formatar o time relativo
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: ptBR 
      });
    } catch (error) {
      return "Data inválida";
    }
  };
  
  // Estilo de badge baseado no status
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case 'in_progress':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case 'failed':
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "";
    }
  };
  
  // Obter ícone baseado no status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto py-6">
        <PageHeader
          title="Administração de Backups"
          description="Gerencie os backups do sistema, crie novos backups e restaure a partir de backups existentes."
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Administração", href: "/admin" },
            { label: "Backups", href: "/admin/backups" }
          ]}
        />

        {/* Status e controles do backup */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Status do Sistema de Backup
              </CardTitle>
              <CardDescription>
                Informações sobre o estado atual do sistema de backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ) : backupStatus ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Último backup completo:</div>
                    <div className="font-medium">{formatRelativeTime(backupStatus.lastFullBackup)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Último backup incremental:</div>
                    <div className="font-medium">{formatRelativeTime(backupStatus.lastIncrementalBackup)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Próximo backup agendado:</div>
                    <div className="font-medium">
                      {backupStatus.nextScheduledBackup ? (
                        <>
                          {formatRelativeTime(backupStatus.nextScheduledBackup)}
                          {backupStatus.nextBackupType && (
                            <Badge variant="outline" className="ml-2">
                              {backupStatus.nextBackupType === 'full' ? 'Completo' : 'Incremental'}
                            </Badge>
                          )}
                        </>
                      ) : "Não agendado"}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Frequência de backup completo:</div>
                    <div className="font-medium">{backupStatus.config.fullBackupFrequency} dias</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Frequência de backup incremental:</div>
                    <div className="font-medium">{backupStatus.config.incrementalBackupFrequency} horas</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Retenção de backups:</div>
                    <div className="font-medium">{backupStatus.config.retentionDays} dias</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-muted-foreground">Compressão de backups:</div>
                    <div className="font-medium">{backupStatus.config.compressBackups ? "Ativada" : "Desativada"}</div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>
                    Não foi possível carregar as informações de status do backup.
                  </AlertDescription>
                </Alert>
              )}
              
              {backupStatus?.isBackupRunning && backupStatus.backupInProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Backup {backupStatus.backupInProgress.type === 'full' ? 'Completo' : 'Incremental'} em andamento
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Iniciado {formatRelativeTime(backupStatus.backupInProgress.startTime)}
                  </div>
                  {backupStatus.backupInProgress.progress && (
                    <>
                      <Progress value={backupStatus.backupInProgress.progress} className="h-2" />
                      <div className="text-xs text-right text-muted-foreground">
                        {Math.round(backupStatus.backupInProgress.progress)}% completo
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  refetchBackups();
                  refetchStatus();
                }}
              >
                Atualizar
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5 text-blue-500" />
                Operações de Backup
              </CardTitle>
              <CardDescription>
                Iniciar um novo backup manual ou restaurar um backup existente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>
                  Você pode iniciar um backup manual a qualquer momento. O backup completo salva todos os dados, enquanto o backup incremental salva apenas as alterações desde o último backup completo.
                </AlertDescription>
              </Alert>
              
              {(backupStatus?.isBackupRunning || createBackupMutation.isPending || restoreBackupMutation.isPending) && (
                <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Operação em andamento</AlertTitle>
                  <AlertDescription>
                    Uma operação de backup ou restauração já está em andamento. Por favor, aguarde a conclusão.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <div className="flex w-full gap-3">
                <Button 
                  variant="default" 
                  className="flex-1"
                  disabled={backupStatus?.isBackupRunning || createBackupMutation.isPending || restoreBackupMutation.isPending}
                  onClick={() => createBackupMutation.mutate('full')}
                >
                  {createBackupMutation.isPending && createBackupMutation.variables === 'full' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Backup Completo
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  disabled={!backupStatus?.lastFullBackup || backupStatus?.isBackupRunning || createBackupMutation.isPending || restoreBackupMutation.isPending}
                  onClick={() => createBackupMutation.mutate('incremental')}
                >
                  {createBackupMutation.isPending && createBackupMutation.variables === 'incremental' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Backup Incremental
                </Button>
              </div>
              
              {!backupStatus?.lastFullBackup && (
                <Alert className="border-blue-200 bg-blue-50 text-blue-800 w-full">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    É necessário realizar um backup completo antes de criar um backup incremental.
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </div>
        
        {/* Lista de backups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Backups Disponíveis
            </CardTitle>
            <CardDescription>
              Lista dos backups disponíveis para restauração
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBackups ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : backups && backups.length > 0 ? (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="full">Completos</TabsTrigger>
                  <TabsTrigger value="incremental">Incrementais</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
                  <BackupTable 
                    backups={sortedBackups} 
                    handleRestoreBackup={handleRestoreBackup}
                    formatDate={formatDate}
                    formatSize={formatSize}
                    getStatusBadgeStyle={getStatusBadgeStyle}
                    getStatusIcon={getStatusIcon}
                    disableRestore={backupStatus?.isBackupRunning || restoreBackupMutation.isPending}
                  />
                </TabsContent>
                
                <TabsContent value="full">
                  <BackupTable 
                    backups={fullBackups}
                    handleRestoreBackup={handleRestoreBackup}
                    formatDate={formatDate}
                    formatSize={formatSize}
                    getStatusBadgeStyle={getStatusBadgeStyle}
                    getStatusIcon={getStatusIcon}
                    disableRestore={backupStatus?.isBackupRunning || restoreBackupMutation.isPending}
                  />
                </TabsContent>
                
                <TabsContent value="incremental">
                  <BackupTable 
                    backups={incrementalBackups}
                    handleRestoreBackup={handleRestoreBackup}
                    formatDate={formatDate}
                    formatSize={formatSize}
                    getStatusBadgeStyle={getStatusBadgeStyle}
                    getStatusIcon={getStatusIcon}
                    disableRestore={backupStatus?.isBackupRunning || restoreBackupMutation.isPending}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg">
                <Info className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="font-medium text-lg mb-1">Nenhum backup encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Não existem backups disponíveis no sistema. 
                  Inicie um backup manual para criar seu primeiro backup.
                </p>
                <Button 
                  onClick={() => createBackupMutation.mutate('full')}
                  disabled={backupStatus?.isBackupRunning || createBackupMutation.isPending}
                >
                  {createBackupMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Criar Primeiro Backup
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmação para restauração */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Restauração</DialogTitle>
            <DialogDescription>
              Você está prestes a restaurar um backup. Essa ação substituirá todos os dados atuais pelos dados do backup selecionado.
              Este processo não pode ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 my-4">
            <div className="flex gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Atenção</p>
                <p>Durante a restauração, o sistema ficará temporariamente indisponível. Todos os usuários atuais serão desconectados.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRestore}
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownCircle className="mr-2 h-4 w-4" />
              )}
              Confirmar Restauração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// Componente de tabela de backups
function BackupTable({ 
  backups, 
  handleRestoreBackup,
  formatDate,
  formatSize,
  getStatusBadgeStyle,
  getStatusIcon,
  disableRestore
}: { 
  backups: BackupMetadata[],
  handleRestoreBackup: (id: string) => void,
  formatDate: (date: string) => string,
  formatSize: (bytes?: number) => string,
  getStatusBadgeStyle: (status: string) => string,
  getStatusIcon: (status: string) => React.ReactNode,
  disableRestore: boolean
}) {
  return (
    <div className="rounded-md border">
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Tabelas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell className="max-w-[100px] truncate font-mono text-xs">
                  {backup.id}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {backup.type === 'full' ? 'Completo' : 'Incremental'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(backup.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 ${getStatusBadgeStyle(backup.status)}`}
                  >
                    {getStatusIcon(backup.status)}
                    <span>
                      {backup.status === 'completed' && 'Concluído'}
                      {backup.status === 'in_progress' && 'Em andamento'}
                      {backup.status === 'pending' && 'Pendente'}
                      {backup.status === 'failed' && 'Falhou'}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>{formatSize(backup.size)}</TableCell>
                <TableCell>
                  {backup.tables ? backup.tables.length : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestoreBackup(backup.id)}
                    disabled={backup.status !== 'completed' || disableRestore}
                  >
                    <ArrowDownCircle className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}