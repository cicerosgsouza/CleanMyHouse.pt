# Time Tracking System - Clean My House

## Overview

This is a full-stack time tracking application built for Clean My House, designed to help employees clock in/out and provide administrators with comprehensive reporting capabilities. The system features location-based time tracking, user management, and automated reporting functionalities.

## System Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

**Frontend**: React-based SPA using Vite for development and build tooling
**Backend**: Express.js REST API with TypeScript
**Database**: PostgreSQL with Drizzle ORM for type-safe database operations
**Authentication**: Replit's OIDC-based authentication system
**Deployment**: Configured for Replit's autoscale deployment platform

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for client-server integration
- **UI Library**: Radix UI components with Tailwind CSS styling (shadcn/ui design system)
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom brand theming (pink/magenta color scheme)

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL adapter
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Passport.js with OpenID Connect strategy (Replit Auth)

### Database Schema
- **Users Table**: Stores user profiles with role-based access (employee/admin)
- **Time Records Table**: Tracks clock-in/out events with geolocation data
- **Sessions Table**: Manages user authentication sessions (required for Replit Auth)
- **Settings Table**: Stores application configuration

## Data Flow

1. **User Authentication**: Users authenticate via Replit OIDC, creating/updating user records
2. **Time Tracking**: Employees clock in/out with optional geolocation capture
3. **Location Services**: Coordinates are reverse-geocoded to readable addresses using OpenStreetMap
4. **Real-time Updates**: Admin dashboard shows live activity feed with 5-second refresh intervals
5. **Report Generation**: Monthly reports are generated as CSV files with email delivery options

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection with serverless compatibility
- **drizzle-orm**: Type-safe ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility
- **tailwindcss**: Utility-first CSS framework

### Authentication & Session Management
- **passport**: Authentication middleware
- **openid-client**: OIDC authentication handling
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Services & Utilities
- **nodemailer**: Email service for report delivery
- **date-fns**: Date manipulation and formatting
- **wouter**: Lightweight routing library
- **cmdk**: Command palette component

## Deployment Strategy

The application is configured for deployment on Replit's platform with:

- **Development**: Hot-reload server with Vite middleware integration
- **Production**: Optimized builds with static asset serving
- **Database**: PostgreSQL 16 module with automatic provisioning
- **Environment**: Node.js 20 runtime with web server capabilities
- **Scaling**: Autoscale deployment target for handling variable loads

The build process creates optimized client bundles and server-side code, with the production server serving both API endpoints and static assets.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **June 28, 2025**: Comprehensive deployment fixes implemented for Replit platform
- **June 28, 2025**: Created production build system with proper static file serving
- **June 28, 2025**: Added health check endpoint at `/health` for deployment monitoring
- **June 28, 2025**: Fixed server startup with proper environment detection and fallbacks
- **June 28, 2025**: Enhanced error handling for production deployment scenarios
- **June 28, 2025**: Fixed seed-users function to not exit process after completion
- **June 28, 2025**: Limpeza completa do banco de dados - removidos todos os usuários de teste inativos
- **June 28, 2025**: Funcionalidade de exclusão alterada para remoção permanente (não apenas desativação)
- **June 28, 2025**: Melhorado tratamento de erro para criação de usuários com detecção de emails duplicados
- **June 28, 2025**: Corrigido campo de email nas configurações - agora permite edição completa e persiste valor
- **June 28, 2025**: Corrigida rota de deletar registros (mudança de POST para DELETE)
- **June 28, 2025**: Revisão completa do código - removidos 86 console.log para otimizar performance
- **June 28, 2025**: Corrigida tipagem TypeScript - removido uso de `any` no App.tsx
- **June 28, 2025**: Melhorado error handling em routes.ts com tipagem adequada
- **June 28, 2025**: Adicionadas verificações de nulo para prevenir crashes
- **June 28, 2025**: Cálculo de horas totais no PDF corrigido definitivamente
- **June 27, 2025**: Sistema de autenticação migrado de Replit Auth para login local com email/senha
- **June 27, 2025**: Implementado sistema de mudança obrigatória de credenciais padrão no primeiro login
- **June 27, 2025**: Sistema de relatórios implementado com geração de PDF funcional usando jsPDF

## Changelog

- June 24, 2025: Initial setup
- June 24, 2025: Migration to local authentication system
- June 24, 2025: Mandatory credential change system implemented