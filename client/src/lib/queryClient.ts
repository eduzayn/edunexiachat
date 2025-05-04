import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Sobrecarga para permitir chamadas no formato apiRequest(url, options)
export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    data?: unknown | undefined;
  },
): Promise<Response>;

// Sobrecarga para permitir chamadas no formato apiRequest(method, url, data)
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response>;

// Implementação real que lida com ambos os formatos
export async function apiRequest<T = any>(
  urlOrMethod: string,
  optionsOrUrl?: {
    method?: string;
    data?: unknown | undefined;
  } | string,
  maybeData?: unknown | undefined
): Promise<Response> {
  let method: string;
  let url: string;
  let data: unknown | undefined;
  
  // Determinar qual formato foi usado
  if (typeof optionsOrUrl === 'string') {
    // Format: apiRequest(method, url, data)
    method = urlOrMethod;
    url = optionsOrUrl;
    data = maybeData;
  } else {
    // Format: apiRequest(url, options)
    url = urlOrMethod;
    method = optionsOrUrl?.method || 'GET';
    data = optionsOrUrl?.data;
  }
  
  console.log(`Fazendo requisição API: ${method} ${url}`, data ? 'com dados' : 'sem dados');
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Registro para debug
    console.log(`Resposta API: ${res.status} ${res.statusText} para ${method} ${url}`);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`Erro na requisição API (${method} ${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      try {
        return await res.json();
      } catch (jsonError) {
        console.error(`Erro ao processar JSON da resposta (${queryKey[0]}):`, jsonError);
        // Em caso de erro no parsing do JSON, retorna um array vazio para evitar quebrar o UI
        return [];
      }
    } catch (error) {
      console.error(`Erro na requisição (${queryKey[0]}):`, error);
      // Retornar um array vazio para prevenir erros na interface
      return [];
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
