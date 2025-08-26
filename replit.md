# Overview

This is an ISBN book search application that allows users to search for book information across multiple Turkish book websites. The application supports both single ISBN searches and bulk searches via Excel file uploads. It scrapes book data including title, author, publisher, price, and availability from sites like Babil, D&R, Kitapsec, and BKM Kitap. The system provides real-time progress tracking for bulk operations and Excel export functionality for search results.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a component-based architecture with clear separation between UI components, business logic hooks, and API interactions. The application uses a modern design system with consistent spacing, typography, and color schemes.

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **File Processing**: Multer for Excel file uploads with XLSX parsing
- **Web Scraping**: Cheerio for HTML parsing with custom scraper classes
- **Session Management**: In-memory storage with interface for future database integration

The backend implements a service-oriented architecture with dedicated scrapers for each book website, centralized search coordination, and progress tracking for bulk operations.

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Design**: 
  - Users table for basic authentication
  - Search sessions for tracking bulk operations
  - Search results for storing individual book data
- **Session Storage**: Currently in-memory with interface abstraction for easy migration to persistent storage

## Search Strategy
- **Multi-site Scraping**: Sequential search across multiple book websites
- **Fallback Mechanism**: Continues to next site if current site fails
- **Data Normalization**: Consistent book data structure across different sites
- **Error Handling**: Graceful degradation with detailed error messages

## File Processing
- **Excel Import**: XLSX file parsing with ISBN validation
- **Export Functionality**: Excel generation with formatted results and conditional styling
- **Validation**: ISBN format validation and duplicate detection

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations and migrations

## UI and Styling
- **Radix UI**: Headless UI primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

## Web Scraping
- **Cheerio**: Server-side HTML parsing and manipulation
- **Custom User Agents**: Browser emulation for scraping protection

## File Processing
- **XLSX**: Excel file reading and writing capabilities
- **Multer**: File upload middleware with memory storage

## Development Tools
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundling for production
- **TanStack Query**: Server state management and caching

## Target Book Websites
- **Babil Kitap**: Turkish book retailer
- **D&R**: Major Turkish book and media retailer  
- **Kitapsec**: Online book platform
- **BKM Kitap**: Turkish book marketplace

The application is designed for scalability with clear interfaces that allow easy addition of new book sites and storage backends.