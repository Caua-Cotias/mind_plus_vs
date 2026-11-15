# MIND + — Project Context

## 1. Project Overview

MIND + is a native mobile streaming platform focused on short-form episodic series produced with Artificial Intelligence.

The platform combines the experience of vertical short videos with serialized storytelling, allowing users to discover series, watch episodes, follow seasons and unlock premium content through subscriptions.

The initial target platforms are Android and iOS.

The product must prioritize mobile usability, performance, scalability, security and a premium cinematic experience.

## 2. Product Architecture

The project will use a monorepo architecture containing three independent applications and shared packages.

### Applications

**apps/mobile**
- Native Android and iOS application.
- React Native.
- Expo.
- Expo Router.
- TypeScript.
- Native video playback.

**apps/admin**
- Independent web administration application.
- Next.js App Router.
- TypeScript.
- Responsive administrative interface.
- Content and platform management.

**apps/api**
- Central backend application.
- Next.js App Router.
- REST API using Route Handlers.
- Business rules.
- Authentication and authorization.
- Subscription validation.
- Content access control.

### Shared packages

**packages/database**
- Prisma ORM.
- PostgreSQL configuration.
- Database schema.
- Migrations.

**packages/contracts**
- Shared TypeScript types.
- API contracts.
- Data validation schemas.

**packages/config**
- Shared development configurations.

The mobile application and administration application must communicate with the central backend API.

Business rules must not be duplicated between applications.

## 3. Technology Stack

### Mobile
- React Native.
- Expo.
- Expo Router.
- TypeScript.
- Expo SecureStore.
- Native video playback compatible with HLS.

### Administration
- Next.js.
- React.
- TypeScript.
- Tailwind CSS.

### Backend
- Next.js.
- Route Handlers.
- TypeScript.
- Better Auth.

### Database
- PostgreSQL.
- Neon.
- Prisma ORM.

### Media
- HLS video streaming.
- Object storage.
- CDN.
- FFmpeg processing pipeline.

Technology versions must be checked for compatibility before installation.

## 4. Visual Identity

The MIND + interface must follow the visual references provided in the project documentation.

Design characteristics:
- Predominantly black background.
- Dark cinematic atmosphere.
- Blue and cyan ambient lighting.
- Purple and colorful gradient details.
- White typography.
- Modern and bold visual language.
- Minimalist interface.
- Smooth transitions.
- Premium streaming aesthetics.

The mobile application must prioritize portrait orientation and one-handed interaction.

## 5. Main Mobile Features

### Authentication
- Email and password registration.
- Email and password login.
- Google authentication.
- Secure session persistence.
- Password recovery.
- Logout.

Use Better Auth with its official Expo integration, after validating compatibility with the selected Expo SDK.

### Home
- Featured series.
- Recently released series.
- Popular content.
- Categories.
- Search.
- Continue watching.
- Featured content banners.

### Series Catalog
Each series must contain:
- Title.
- Description.
- Synopsis.
- Poster.
- Featured image.
- Genres.
- Age rating.
- Publication status.
- Seasons.
- Episodes.

### Episodes
Each episode must contain:
- Title.
- Description.
- Episode number.
- Season relationship.
- Thumbnail.
- Video reference.
- Duration.
- Publication status.
- Free or premium access classification.

### Vertical Reels Player

This is one of the platform's most important features.

Requirements:
- 9:16 vertical video.
- Swipe-based episode navigation.
- Play and pause.
- Progress indicator.
- Automatic playback when appropriate.
- Episode information overlay.
- Smooth transitions.
- Loading and buffering states.
- HLS compatibility.
- Watch progress persistence.

The implementation must use a React Native-compatible video solution, not browser-only video libraries.

### Subscriptions

- Free content access.
- Premium episode restrictions.
- Active subscription validation.
- Subscription purchase flow.
- Locked episode interface.
- Server-side access validation.

Never trust frontend subscription status as the source of authorization.

## 6. Administration Application

The administration interface must be independent from the mobile application.

Features:
- Administrator authentication.
- Role-based permissions.
- Series management.
- Season management.
- Episode management.
- Video asset management.
- Thumbnail and poster management.
- Content publication controls.
- Free and premium content configuration.
- User management.
- Subscription overview.
- Basic platform analytics.

Only authorized administrators may access administrative operations.

## 7. Backend Responsibilities

The central API is responsible for:
- Authentication.
- User management.
- Content catalog.
- Series and season relationships.
- Episode metadata.
- Subscription validation.
- Premium content authorization.
- Watch progress.
- Administrative operations.
- Payment provider integration.
- Media access authorization.

Use REST endpoints with consistent response structures and validation.

Protect private endpoints using authenticated sessions and role-based authorization.

## 8. Database Entities

Plan the initial data model around:

- User
- Session
- Account
- Verification
- Role
- Series
- Season
- Episode
- Category
- SeriesCategory
- Subscription
- Payment
- WatchProgress
- MediaAsset

Better Auth managed entities must follow the schema and migration requirements of the installed Better Auth version.

Define relationships, indexes, constraints and access rules carefully.

## 9. Security

- Validate requests on the backend.
- Never expose secrets in mobile or web applications.
- Protect administrator operations.
- Validate premium access server-side.
- Protect video resources.
- Use signed URLs or an equivalent authorized media delivery strategy.
- Validate payment webhooks.
- Never trust payment status submitted by the client.
- Use environment variables.
- Implement structured error handling.

## 10. Development Methodology

Development must be incremental.

Before each implementation phase:
1. Inspect the existing repository.
2. Understand the current architecture.
3. Identify dependencies.
4. Present an implementation plan.
5. Wait for approval for significant architectural changes.

After implementation:
1. Run type checks.
2. Run linting.
3. Run relevant tests.
4. Verify the affected application.
5. Explain changed files.
6. Report remaining issues.

Do not implement multiple unrelated modules in a single task.

Do not install unnecessary dependencies.

Do not overwrite existing working functionality without justification.

## 11. Initial Development Roadmap

Phase 1: Repository and monorepo foundation.

Phase 2: Expo mobile application foundation.

Phase 3: Backend API and authentication.

Phase 4: Database architecture.

Phase 5: Independent administration application.

Phase 6: MIND + mobile design system.

Phase 7: Series catalog and content management.

Phase 8: Vertical video player and HLS.

Phase 9: Subscription and premium access.

Phase 10: Testing, security and production deployment.

## 12. Claude Code Role

Act as the senior software architect and full-stack engineer responsible for the MIND + project.

Always:
- Read this document before starting work.
- Inspect relevant source files before modifying them.
- Explain technical decisions.
- Prefer maintainable and modular solutions.
- Keep applications independent but connected through shared contracts and APIs.
- Preserve architectural consistency.
- Avoid speculative implementations.
- Ask for clarification when an important product decision is missing.

Do not build the entire platform in one operation.

The objective is to develop a production-ready native streaming platform through small, tested and approved milestones.