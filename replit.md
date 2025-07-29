# Replit.md - TimeTracker Pro

## Overview

TimeTracker Pro is a full-stack web application for tracking work hours across different organizational roles. Built for industrial environments with specific activities like NDE inspections and repairs, the application provides role-based access control, comprehensive reporting, and data export capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with proper error handling and logging

### Database Design
- **Primary Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle with schema-first approach
- **Schema Location**: `shared/schema.ts` for type sharing between frontend and backend
- **Migrations**: Drizzle Kit for database migrations
- **Key Entities**:
  - Users (with role-based access)
  - Work Hours (time tracking entries)
  - Job Orders (project/commission management)
  - Sessions (authentication state)

## Key Components

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC flow
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Role System**: Three-tier access control (operator, team_leader, admin)
- **Security**: HTTP-only cookies, CSRF protection, secure session management

### User Interface Components
- **Navigation**: Tab-based interface with role-specific menu items
- **Dashboard**: Statistics overview with role-appropriate data
- **Hours Entry Form**: Validated form with activity type selection and job order tracking
- **History View**: Filterable table of work hour entries with search capabilities
- **Reports**: Export functionality for PDF, CSV, and Excel formats
- **Admin Panel**: User management and system configuration (admin-only)

### Data Models
```typescript
// Core entities with strong typing
- User: id, email, firstName, lastName, role, teamId
- WorkHours: operatorName, workDate, jobNumber, activityType, hoursWorked, notes
- JobOrder: jobNumber, jobName, status, priority
- Session: sid, sess, expire (for authentication)
```

### Activity Types (Industry-Specific)
- NDE-MT/PT (Non-Destructive Testing - Magnetic/Penetrant)
- NDE-UT (Ultrasonic Testing)
- RIP.NDE - MT/PT (Repair NDE)
- RIP.NDE - UT (Repair Ultrasonic)
- ISPEZIONE WI (Work Instruction Inspection)
- RIP.ISPEZIONE WI (Repair Work Instruction)

## Data Flow

### Authentication Flow
1. User accesses application → redirected to Replit Auth if not authenticated
2. OIDC flow completes → user session created in PostgreSQL
3. Subsequent requests validated via session middleware
4. Role-based access control applied at route level

### Work Hours Entry Flow
1. User submits hours via validated form
2. Backend validates data using Zod schemas
3. Data stored in PostgreSQL with user association
4. Real-time updates via React Query cache invalidation
5. Statistics automatically recalculated

### Data Export Flow
1. User requests export (PDF/CSV/Excel)
2. Backend queries filtered data based on user role and permissions
3. Data formatted according to export type
4. File generated and served for download

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless
- **Authentication**: Replit Auth service
- **UI Components**: Radix UI primitives via shadcn/ui
- **Form Validation**: Zod for runtime type checking
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

### Development Dependencies
- **TypeScript**: Full type safety across the stack
- **Vite**: Fast development server and optimized builds
- **ESLint/Prettier**: Code quality and formatting
- **Drizzle Kit**: Database schema management and migrations

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Hot Module Replacement
- **Database**: Neon PostgreSQL with environment-based configuration
- **Authentication**: Replit Auth with development domain configuration
- **Asset Handling**: Vite static asset processing

### Production Build
- **Frontend**: Vite production build with optimized bundle splitting
- **Backend**: ESBuild compilation for Node.js deployment
- **Static Assets**: Served from `dist/public` directory
- **Environment Configuration**: DATABASE_URL and authentication secrets via environment variables

### Replit-Specific Features
- **Cartographer Integration**: Development-time code mapping
- **Runtime Error Overlay**: Enhanced error reporting in development
- **Domain Configuration**: Multi-domain support for authentication flows
- **Session Management**: Optimized for Replit's hosting environment

The application is designed for scalability and maintainability, with clear separation of concerns, type safety throughout the stack, and comprehensive error handling for production use.