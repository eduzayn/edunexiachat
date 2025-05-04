/**
 * Configuração de rotas da API
 *
 * Este arquivo define as rotas da API para a aplicação EduChatConnect.
 */
import { Router } from 'express';
import { IStorage } from './storage';
/**
 * Configura as rotas de API
 * @param router Router do Express
 * @param storage Interface de armazenamento
 * @returns Router configurado
 */
export declare function setupRoutes(router: Router, storage: IStorage): Router;
