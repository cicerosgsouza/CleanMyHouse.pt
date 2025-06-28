import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function startServer() {
  try {
    // Create server first
    const server = await registerRoutes(app);

    // Critical: Add health check BEFORE any other routes
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        message: 'Clean My House - Time Tracking System',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'production'
      });
    });

    // Root endpoint for deployment health checks
    app.get('/', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        message: 'Clean My House - Time Tracking System',
        timestamp: new Date().toISOString()
      });
    });

    // Setup static serving based on environment
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      try {
        serveStatic(app);
      } catch (error) {
        console.warn("Static files not available, continuing with API only");
      }
    }

    // Error handling middleware (must be last)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error("Server error:", err);
    });

    const port = parseInt(process.env.PORT || "5000", 10);
    const host = "0.0.0.0";
    
    return new Promise((resolve) => {
      server.listen(port, host, () => {
        log(`Server running on ${host}:${port} in ${process.env.NODE_ENV || 'production'} mode`);
        
        console.log('Environment variables:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- PORT:', process.env.PORT);
        console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

        // Non-blocking seeding
        setImmediate(async () => {
          try {
            const { seedUsers } = await import('./seed-users');
            await seedUsers();
            log("User seeding completed successfully");
          } catch (error) {
            console.error("Error seeding users:", error);
          }
        });
        
        log("Server initialization complete - ready to accept connections");
        resolve(server);
      });

      server.on('error', (error: any) => {
        console.error('Server error:', error);
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, exiting...`);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();