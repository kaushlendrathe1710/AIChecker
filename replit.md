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
- `users` - User accounts with email-based identification
- `sessions` - Active user sessions
- `otpCodes` - Temporary verification codes
- `documents` - Uploaded document metadata
- `scanResults` - Plagiarism analysis results
- `sourceMatches` - Individual matched sources from scans

### Authentication and Authorization

The platform uses a passwordless authentication flow:
1. User enters email address
2. Server generates 6-digit OTP and sends via email (Nodemailer + SMTP)
3. User enters OTP to verify
4. Server creates session and returns session ID
5. Client stores session ID and includes it in `x-session-id` header for authenticated requests

New users complete a registration step after first login to provide their full name and role (student/teacher).

### External Dependencies

- **OpenAI API**: Used for AI content detection through Replit AI Integrations (custom base URL)
- **AWS S3**: Document storage with presigned URLs for downloads
- **SMTP Email**: OTP delivery using Nodemailer
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` or `NEON_DATABASE_URL`)

### Plagiarism Scanning Pipeline

1. Document uploaded and stored in S3
2. Text extracted using mammoth (DOCX) or pdf-parse (PDF)
3. Text split into chunks for analysis
4. OpenAI API analyzes chunks for AI-generated content patterns
5. Results stored with highlighted sections and source matches
6. Report generated with overall score, AI score, and web score

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