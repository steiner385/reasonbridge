# uniteDiscord

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)
![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)

## 📖 Overview

**uniteDiscord** is a rational discussion platform built on Discord. It enables communities to have constructive conversations with built-in tools for analyzing tone, establishing common ground, and facilitating healthy discourse. The platform provides real-time feedback mechanisms, moderation capabilities, and analytics to promote respectful and productive discussions.

### Key Features

- **Tone Analysis** - Analyze and visualize the emotional tone of discussions
- **Common Ground Detection** - Identify areas of agreement between participants
- **Clarity Scoring** - Measure and improve the clarity of arguments
- **Real-time Feedback** - Provide interactive feedback during conversations
- **Moderation Tools** - Review and moderate content with confidence scoring
- **User Trust System** - Track user reputation and verification status
- **Feedback Analytics** - Measure the effectiveness of feedback mechanisms

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.0.0 or higher
- **pnpm** 9.0.0 or higher (package manager)
- **Docker** and **Docker Compose** (for services and testing)
- **PostgreSQL** 14+ (via Docker recommended)
- **Redis** (via Docker recommended)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/steiner385/uniteDiscord.git
   cd uniteDiscord
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your configuration values (Discord token, database credentials, etc.)

4. **Start services**

   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

6. **Seed the database (optional)**

   ```bash
   pnpm db:seed
   ```

7. **Start development servers**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:4000

## 📚 Usage

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development servers (frontend + backend services)
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test                 # All tests
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests only
pnpm test:contract       # Contract tests only
pnpm test:e2e            # End-to-end tests (frontend)

# Code quality
pnpm lint                # Check for linting issues
pnpm lint:fix            # Fix linting issues
pnpm format              # Format code with Prettier
pnpm typecheck           # Run TypeScript type checking

# Database
pnpm db:migrate          # Run database migrations
pnpm db:studio           # Open Prisma Studio (visual DB manager)
pnpm db:seed             # Seed database with sample data

# Docker
pnpm docker:up           # Start services
pnpm docker:down         # Stop services
```

### Using Make

Alternatively, use the Makefile for common tasks:

```bash
make setup               # Install dependencies and start services
make dev                 # Start development servers
make test                # Run all tests
make lint                # Lint code
make clean               # Clean all build artifacts
```

## 🏗️ Architecture

### Project Structure

```
uniteDiscord/
├── frontend/                 # React 18 frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API clients and utilities
│   │   ├── types/           # TypeScript type definitions
│   │   └── App.tsx          # Root component
│   └── vite.config.ts
│
├── services/                 # Backend microservices
│   ├── api-gateway/         # API Gateway (entry point)
│   ├── user-service/        # User management and authentication
│   ├── discussion-service/  # Discussion and message handling
│   ├── moderation-service/  # Content moderation
│   ├── notification-service/# Real-time notifications
│   ├── ai-service/          # AI-powered analysis (tone, clarity)
│   ├── fact-check-service/  # Fact-checking capabilities
│   └── recommendation-service/ # Content recommendations
│
├── packages/                 # Shared packages
│   ├── db-models/           # Database models (Prisma)
│   ├── common/              # Common utilities and types
│   ├── event-schemas/       # Event definitions
│   ├── ai-client/           # AI service client
│   └── testing-utils/       # Testing utilities
│
├── infrastructure/           # Infrastructure configuration
├── scripts/                  # Build and utility scripts
└── .jenkins/                 # Jenkins CI/CD configuration

```

### Technology Stack

**Frontend:**
- React 18 - UI framework
- TypeScript 5.7 - Type safety
- Vite 6 - Build tool and dev server
- ESLint & Prettier - Code quality

**Backend:**
- Node.js 20 LTS - Runtime
- Express.js - API framework
- TypeScript - Type safety
- Prisma - ORM and database toolkit

**Data & Services:**
- PostgreSQL - Primary database
- Redis - Caching and real-time features
- LocalStack - AWS service emulation (S3, SQS, etc.)
- Docker & Docker Compose - Containerization

**Testing:**
- Vitest - Unit testing framework
- Contract testing - API contract validation
- Jest - E2E testing

## ⚙️ Configuration

### Environment Variables

The application uses environment variables for configuration. See `.env.example` for all available options:

**Key Configuration Areas:**
- **Application** - Node environment, logging level
- **Discord Bot** - Token, client ID, guild ID
- **Database** - PostgreSQL connection details
- **Cache** - Redis connection configuration
- **AWS/LocalStack** - S3, SQS, and other service credentials
- **Authentication** - Cognito user pool configuration
- **API Keys** - Optional OpenAI API for advanced features

### Database

The project uses Prisma for database management. Prisma schema is defined in `packages/db-models/prisma/schema.prisma`.

**Common Database Commands:**

```bash
# Create a new migration
pnpm db:migrate create --name migration_name

# Apply pending migrations
pnpm db:migrate deploy

# View database in Prisma Studio
pnpm db:studio

# Generate Prisma client
pnpm db:generate
```

## 📖 Documentation

- **[Frontend README](./frontend/README.md)** - Frontend-specific setup and development
- **[Architecture Documentation](./specs/001-rational-discussion-platform/)** - Detailed architecture and design specifications
- **API Documentation** - Generated from OpenAPI/GraphQL schemas in `specs/*/contracts/`
- **[Contributing Guidelines](#contributing)** - How to contribute to the project

## 🧪 Testing

The project uses multiple testing strategies:

```bash
# Unit Tests
pnpm test:unit              # Run all unit tests
pnpm test:unit:watch       # Watch mode for development
pnpm test:unit:coverage    # Generate coverage reports

# Integration Tests
pnpm test:integration      # Run integration tests with real services

# Contract Tests
pnpm test:contract         # Validate API contracts

# End-to-End Tests
pnpm test:e2e             # Run frontend E2E tests
```

Test coverage reports are generated in the `coverage/` directory.

## 🚀 Deployment

### CI/CD Pipeline

The project uses Jenkins for continuous integration. The pipeline includes:

1. **Setup** - Install dependencies
2. **Lint & Type Check** - Validate code quality
3. **Unit Tests** - Run unit tests with coverage
4. **Integration Tests** - Run integration tests
5. **Build** - Build Docker images

See `Jenkinsfile` for complete pipeline configuration.

### Docker

Build and run the application using Docker:

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Run tests in containers
docker-compose -f docker-compose.test.yml up
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feat/description-of-feature
   ```

2. **Make your changes** and write tests
   ```bash
   pnpm lint:fix            # Fix linting issues
   pnpm format              # Format code
   pnpm test                # Run tests
   ```

3. **Commit with clear messages**
   ```bash
   git commit -m "feat: description of changes"
   ```

4. **Push and create a Pull Request**
   ```bash
   git push origin feat/description-of-feature
   ```

5. **Ensure CI passes** and request reviews

## 📋 Project Issues & Roadmap

The project uses GitHub Issues for task tracking with a prioritization framework. Issues are labeled with:

- **Foundation Level** - L0 (critical), L1 (high), L2 (medium), L3 (low)
- **Business Value** - 1-10 scale
- **Effort** - Estimated hours
- **Status** - in-progress, blocked, ready

To view and work on issues:

```bash
# See next recommended issue
npm run next-issue:preview

# Claim and work on next issue
npm run next-issue
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

For questions or issues:

- Open a [GitHub Issue](https://github.com/steiner385/uniteDiscord/issues)
- Check existing [discussions](https://github.com/steiner385/uniteDiscord/discussions)
- Review project [specifications](./specs/)

## 📊 Project Status

**Current Phase:** Foundation (L0-L3 Infrastructure Tasks)

**Completion Status:**
- Core infrastructure and microservices architecture ✓
- Frontend application scaffolding ✓
- Database models and migrations ✓
- API contracts and interfaces ✓
- ~170+ issues in active development

Track progress in [GitHub Issues](https://github.com/steiner385/uniteDiscord/issues).
