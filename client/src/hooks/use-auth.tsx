import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Definindo os tipos
export type PublicUser = Omit<User, "password">;

const loginSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Por favor, insira um email válido"),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha deve ter pelo menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não correspondem",
  path: ["confirmPassword"],
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Definindo o tipo do contexto de autenticação
type AuthContextType = {
  user: PublicUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<PublicUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<PublicUser, Error, RegisterData>;
};

// Criando o contexto com um valor padrão
export const AuthContext = createContext<AuthContextType | null>(null);

// Componente provedor de autenticação
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<PublicUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        console.log("Fetching user data...");
        const response = await fetch("/api/user", {
          credentials: "include",
        });
        
        if (response.status === 401) {
          console.log("User not authenticated");
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        
        const userData = await response.json();
        console.log("User data fetched:", userData);
        return userData;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Attempting login...", credentials.username);
        
        // Adiciona um breve atraso antes de fazer a requisição
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include"
        });
        
        if (!res.ok) {
          let errorMessage = `Login falhou: ${res.statusText}`;
          try {
            const errorData = await res.json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            console.error("Erro ao processar resposta de erro:", e);
          }
          
          console.error("Login response not OK:", res.status, errorMessage);
          throw new Error(errorMessage);
        }
        
        const userData = await res.json();
        console.log("Login successful, user data:", userData);
        
        // Adiciona breve atraso após login bem-sucedido
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (data: PublicUser) => {
      console.log("Login mutation success, setting user data");
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Login realizado",
        description: `Bem-vindo(a) de volta, ${data.name || data.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Falha no login",
        description: error.message || "Nome de usuário ou senha inválidos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      try {
        console.log("Attempting registration...");
        // Remove confirmPassword before sending to server
        const { confirmPassword, ...userData } = credentials;
        
        // Adiciona um breve atraso antes de fazer a requisição
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
          credentials: "include"
        });
        
        if (!res.ok) {
          let errorMessage = `Registro falhou: ${res.statusText}`;
          try {
            const errorData = await res.json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            console.error("Erro ao processar resposta de erro:", e);
          }
          
          console.error("Registration response not OK:", res.status, errorMessage);
          throw new Error(errorMessage);
        }
        
        const userResult = await res.json();
        console.log("Registration successful, user data:", userResult);
        
        // Adiciona breve atraso após registro bem-sucedido
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return userResult;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (data: PublicUser) => {
      console.log("Registration mutation success");
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Registro realizado",
        description: `Bem-vindo(a) ao EduChat, ${data.name || data.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Falha no registro",
        description: error.message || "Não foi possível criar a conta",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Attempting logout...");
        
        // Adiciona um breve atraso antes de fazer a requisição
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const res = await fetch("/api/logout", {
          method: "POST",
          credentials: "include"
        });
        
        if (!res.ok) {
          console.error("Logout response not OK:", res.status);
          throw new Error(`Logout falhou: ${res.statusText}`);
        }
        console.log("Logout successful");
        
        // Adiciona breve atraso após logout bem-sucedido
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Logout mutation success, clearing user data");
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta",
      });
    },
    onError: (error: Error) => {
      console.error("Logout mutation error:", error);
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refetch user data when auth status might have changed
  useEffect(() => {
    const handleStorageChange = () => {
      console.log("Storage changed, refetching user data");
      refetch();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acessar o contexto de autenticação
 * @returns Contexto de autenticação
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
