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
    const server = await registerRoutes(app);

    // Health check route for deployment - must be before static setup
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        message: 'Clean My House - Time Tracking System',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'production'
      });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("Server error:", err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      // Production mode - handle static files
      const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
      
      if (fs.existsSync(distPath)) {
        console.log(`Serving static files from: ${distPath}`);
        app.use(express.static(distPath));
        
        // Serve index.html for SPA routing
        app.get("*", (_req, res) => {
          const indexPath = path.resolve(distPath, "index.html");
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.status(200).json({ 
              status: 'ok', 
              message: 'Clean My House - Time Tracking System - Build Error',
              timestamp: new Date().toISOString()
            });
          }
        });
      } else {
        console.warn(`Build directory not found at: ${distPath}`);
        // Fallback when build is not available
        app.get("*", (_req, res) => {
          res.status(200).json({ 
            status: 'ok', 
            message: 'Clean My House - Time Tracking System - No Build',
            timestamp: new Date().toISOString(),
            note: 'Build files not found, API endpoints available'
          });
        });
      }
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.HOST || "0.0.0.0";
    
    server.listen(port, host, async () => {
      log(`Server running on ${host}:${port} in ${process.env.NODE_ENV || 'production'} mode`);
      
      // Log environment info for debugging
      console.log('Environment variables:');
      console.log('- NODE_ENV:', process.env.NODE_ENV);
      console.log('- PORT:', process.env.PORT);
      console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

      // Seed users after server is running
      try {
        const { seedUsers } = await import('./seed-users');
        await seedUsers();
        log("User seeding completed successfully");
      } catch (error) {
        console.error("Error seeding users:", error);
        // Don't exit, just log the error
      }
      
      log("Server initialization complete - ready to accept connections");
    });

    // Handle process termination gracefully
    process.on('SIGTERM', () => {
      log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        log('Process terminated');
      });
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();