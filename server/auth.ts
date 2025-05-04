import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    // Extend Express.User with the schema User type
    interface User {
      id: number;
      username: string;
      password: string;
      name: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "eduChat_secret_key_improved",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      sameSite: 'lax',
      httpOnly: true,
      secure: false, // Forçando para false durante desenvolvimento
      path: "/"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Autenticando usuário:", username);
        
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.warn(`Usuário não encontrado: ${username}`);
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          console.warn(`Senha incorreta para o usuário: ${username}`);
          return done(null, false);
        }
        
        console.log(`Usuário autenticado com sucesso: ${username} (ID: ${user.id})`);
        return done(null, user);
      } catch (err) {
        console.error("Erro na estratégia local de autenticação:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializando usuário: ${user.username} (ID: ${user.id})`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Desserializando usuário ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.warn(`Usuário com ID ${id} não encontrado durante a desserialização`);
        return done(null, false);
      }
      
      console.log(`Usuário desserializado com sucesso: ${user.username}`);
      done(null, user);
    } catch (err) {
      console.error(`Erro ao desserializar usuário ID ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Tentativa de registro:", req.body.username);
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.warn(`Registro falhou: Nome de usuário já existe: ${req.body.username}`);
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }

      console.log("Criando novo usuário:", req.body.username);
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      console.log(`Usuário criado com sucesso: ${user.username} (ID: ${user.id})`);
      req.login(user, (err) => {
        if (err) {
          console.error("Erro ao logar novo usuário após registro:", err);
          return next(err);
        }
        
        console.log(`Usuário ${user.username} autenticado após registro`);
        res.status(201).json({ 
          id: user.id, 
          username: user.username, 
          name: user.name,
          email: user.email
        });
      });
    } catch (err) {
      console.error("Erro durante o registro:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.warn("Login failed: Invalid credentials");
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("User logged in successfully:", user.id);
        return res.status(200).json({ 
          id: user.id, 
          username: user.username, 
          name: user.name,
          email: user.email
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      console.log("User logged out successfully");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("User not authenticated when accessing /api/user");
      return res.sendStatus(401);
    }
    
    const user = req.user as User;
    console.log("User data requested:", user.id);
    res.json({ 
      id: user.id, 
      username: user.username, 
      name: user.name,
      email: user.email 
    });
  });
}
