# PlagiarismGuard - AI-Powered Plagiarism Detection Platform

## Overview

PlagiarismGuard is a web-based plagiarism detection platform that analyzes documents for plagiarism and AI-generated content. The application allows users to upload documents (PDF, DOCX, TXT), scan them for originality, and view detailed reports with highlighted sections showing potential matches.

The platform features a passwordless authentication system using OTP (one-time password) via email, document management with cloud storage, and AI-powered content analysis using OpenAI's API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens defined in CSS variables
- **Build Tool**: Vite with React plugin

The frontend follows a page-based structure with protected routes requiring authentication. The sidebar navigation pattern provides access to dashboard, document upload, document list, and history views.

### Backend Architecture

- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Authentication**: Session-based with OTP email verification (no passwords)
- **File Processing**: Multer for multipart uploads, custom text extractors for PDF/DOCX/TXT

The backend uses a storage abstraction layer (`IStorage` interface) implemented with PostgreSQL, making it possible to swap storage backends if needed.

### Data Storage Solutions

- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **File Storage**: AWS S3 for document uploads
- **Session Storage**: Database-backed sessions with expiration

Key database tables:
- `users` - User accounts with email-based identification (includes isAdmin, isSuperAdmin flags)
- `sessions` - Active user sessions (7-day expiry, stored in localStorage for persistence)
- `otpCodes` - Temporary verification codes
- `documents` - Uploaded document metadata
- `scanResults` - Plagiarism analysis results
- `sourceMatches` - Individual matched sources from scans
- `grammarResults` - Grammar check analysis results
- `subscriptionPlans` - Custom subscription plans with pricing, limits, and feature flags

### Authentication and Authorization

The platform uses a passwordless authentication flow:
1. User enters email address
2. Server generates 6-digit OTP and sends via email (Nodemailer + SMTP)
3. User enters OTP to verify
4. Server creates session and returns session ID
5. Client stores session ID and includes it in `x-session-id` header for authenticated requests

New users complete a registration step after first login to provide their full name and role (student/teacher).

### Admin System

The platform includes a comprehensive admin panel with role-based access control:

- **Super Admin**: kaushlendra.k12@fms.edu (auto-seeded on server startup)
  - Cannot be deleted or demoted
  - Has full access to all admin features
  - Only user who can create or remove other admins
- **Regular Admins**: Can view all users, documents, and system statistics
- **Admin Panel Features**:
  - Dashboard with system statistics (total users, documents, active sessions)
  - User management (view all users, delete non-admin users)
  - Admin management (promote/demote users - super admin only)
  - Document oversight (view all uploaded documents)
  - Subscription management with custom plan creation (super admin only)
  - Manual user subscription assignment (super admin only)
- **Protected Routes**:
  - `/api/admin/*` routes require admin authentication
  - Super admin actions require additional `superAdminMiddleware`

### Subscription System

The platform uses Stripe for subscription management with customizable tiers. Super admins can create/edit/delete plans with:
- Configurable pricing (amount in cents, currency, billing interval)
- Monthly scan limits (-1 for unlimited)
- Feature flags: AI detection, grammar checking, API access, team management, priority support
- Active/inactive status and display ordering

Super admins can also manually assign any plan to any user, bypassing Stripe checkout for special cases.

Key components:
- `server/stripeClient.ts`: Stripe client initialization using Replit's Stripe connector
- `server/stripeService.ts`: Service layer for Stripe operations (customers, checkout, portal)
- `server/webhookHandlers.ts`: Webhook processing for subscription events
- `server/seed-products.ts`: One-time script to create products in Stripe
- `client/src/pages/subscription.tsx`: Subscription management UI

User schema includes:
- `stripeCustomerId`: Stripe customer ID for the user
- `stripeSubscriptionId`: Active subscription ID
- `subscriptionStatus`: Status of subscription (active, canceled, etc.)
- `subscriptionPlan`: Name of the current plan

### External Dependencies

- **Stripe**: Payment processing and subscription management via Replit Stripe connector
- **OpenAI API**: Used for AI content detection through Replit AI Integrations (custom base URL)
- **AWS S3**: Document storage with presigned URLs for downloads
- **SMTP Email**: OTP delivery using Nodemailer
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` or `NEON_DATABASE_URL`)

### Plagiarism Scanning Pipeline

1. Document uploaded and stored in S3
2. Text extracted using mammoth (DOCX) or pdf-parse (PDF)
3. Text split into chunks for analysis (500 tokens per chunk, up to 8 chunks for AI detection)
4. OpenAI GPT-4o analyzes content using two parallel detection methods:
   - **AI Content Detection**: Analyzes structural patterns, linguistic markers, content characteristics, and semantic patterns to identify AI-generated text. Identifies specific AI models (ChatGPT, Claude, Grok, Gemini) with confidence scores.
   - **Web Plagiarism Detection**: Checks 15 sample sentences against known patterns with confidence scoring (45+ threshold for matches). Aggressively flags academic patterns: complex sentences, passive voice, sophisticated vocabulary, textbook-style definitions.
5. **Internal Database Comparison**: Compares against all previously submitted documents using MD5 fingerprints. Privacy-safe implementation - no user-identifiable data exposed in responses.
6. **Optional Web Search**: Structure ready for Google Custom Search API integration (requires GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX secrets)
7. Results stored with highlighted sections indicating AI-generated or plagiarized content
8. Report generated with overall score, AI score, and web score with match details

Key files:
- `server/aiScanner.ts`: AI content detection with model identification (detectAiModel function)
- `server/plagiarismScannerService.ts`: Enhanced scanning with internal database and web search integration
- `server/internalPlagiarismChecker.ts`: Document fingerprinting for duplicate detection
- `server/webSearchService.ts`: Web search integration (currently disabled, ready for API key)

### Grammar Checking Pipeline

1. Document text extracted and split into 2500-token chunks (up to 5 chunks)
2. OpenAI GPT-4o analyzes for grammar, spelling, punctuation, and style errors
3. Each error categorized with type, severity, explanation, and correction
4. Corrected text generated by applying fixes in reverse order to preserve indexes
5. Results displayed with error breakdown by category and severity
6. Users can copy corrected text or download as a file

### Replit Integrations

The project includes pre-built integration modules in `server/replit_integrations/`:
- **batch**: Utilities for batch processing with rate limiting and retries
- **chat**: Conversation storage and OpenAI chat completions
- **image**: Image generation using OpenAI's gpt-image-1 model
These follow a pattern of exporting route registration functions and storage interfaces for easy integration.

### Environment Variables

Required secrets:
- `AWS_ACCESS_KEY_ID`: AWS access key for S3
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for S3
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_BUCKET_NAME`: S3 bucket name for document storage
- `SMTP_*`: Email configuration for OTP delivery
- `DATABASE_URL`: PostgreSQL connection string