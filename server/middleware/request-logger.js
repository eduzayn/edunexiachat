/**
 * Middleware para logging de requisições HTTP
 *
 * Este middleware registra informações sobre todas as requisições HTTP
 * recebidas pela aplicação, incluindo método, URL, IP e tempo de resposta.
 */
import { log } from '../utils/logger';
/**
 * Middleware para logging de requisições HTTP
 */
export function requestLoggerMiddleware(req, res, next) {
    // Registrar o horário de início da requisição
    var startTime = Date.now();
    // Capturar informações básicas da requisição
    var method = req.method;
    var url = req.originalUrl || req.url;
    var ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    var userAgent = req.headers['user-agent'] || 'unknown';
    // Log inicial da requisição
    log("".concat(method, " ").concat(url, " - In\u00EDcio"), 'request');
    // Interceptar métodos de resposta para capturar quando a resposta for enviada
    var originalEnd = res.end;
    var originalJson = res.json;
    var originalSend = res.send;
    // Função para registrar o log final da resposta
    var logResponse = function () {
        // Calcular tempo de resposta
        var responseTime = Date.now() - startTime;
        // Obter o status da resposta
        var statusCode = res.statusCode;
        // Determinar nível de log baseado no status
        var level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        // Registrar log detalhado da resposta
        log("".concat(method, " ").concat(url, " - Completado ").concat(statusCode, " em ").concat(responseTime, "ms"), 'request', level);
    };
    // Sobrescrever métodos para capturar o envio da resposta
    res.end = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        logResponse();
        return originalEnd.apply(this, args);
    };
    res.json = function (body) {
        logResponse();
        return originalJson.call(this, body);
    };
    res.send = function (body) {
        logResponse();
        return originalSend.call(this, body);
    };
    next();
}
export default requestLoggerMiddleware;
