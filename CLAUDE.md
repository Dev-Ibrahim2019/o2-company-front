# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development Server**: `npm run dev` - Starts Vite dev server with HMR
- **Build**: `npm run build` - Compiles TypeScript and builds for production
- **Lint**: `npm run lint` - Runs ESLint on all TypeScript/JSX files
- **Preview**: `npm run preview` - Previews production build locally
- **Type Checking**: `npx tsc --noEmit` - Type-checks without emitting files

## Project Structure

### Core Architecture
- **React 19** with **TypeScript** and **Vite** as the build tool
- **Custom Context API** for state management (`src/store.tsx`) - replaces Redux/Zustand
- **React Router DOM v7** for routing (though currently using programmatic navigation in App.tsx)
- **Modular component organization** by feature/domain

### Key Directories
- `src/components/` - Reusable UI components organized by feature:
  - `administration/` - Admin portal components (branches, departments, employees, items, etc.)
  - `POS/` - Point of Sale components (tables, orders, shift management)
  - `Layout.tsx`, `AdminLayout.tsx`, `POSLayout.tsx` - Layout components
- `src/hooks/` - Custom React hooks for data fetching and state logic
- `src/services/` - Service layer for business logic (API wrappers, utility functions)
- `src/api/` - API configuration and endpoint definitions
- `src/types/` - TypeScript interfaces and enums for all domain models

### State Management
- Centralized state via `AppContext` in `store.tsx` with providers for:
  - User authentication and role-based access control
  - Branch, department, employee, menu item management
  - Order processing (cart, active orders, table management)
  - Financial transactions, accounting, journal entries
  - Shift management, attendance, activity logging
  - Customer feedback, staff tasks, notifications
- State updates follow immutable patterns using spread operators
- Mock data initialized for development/testing

### Routing & Navigation
- Programmatic navigation via `activeView` state in `App.tsx`
- Role-based view switching (ADMIN/FINANCE see admin layout, others see POS layout)
- Views include: POS, tables, orders, shift, finance dashboard, accounting, organizational structure
- Layout components (`AdminLayout`, `POSLayout`) handle common UI elements

## Common Development Patterns

### Component Structure
- Functional components with TypeScript props interfaces
- Export named components (e.g., `export const MyComponent = () => {}`)
- CSS modules or traditional CSS files for styling (`*.css`)
- Event handlers use inline arrow functions or bound methods
- Conditional rendering with ternary operators and logical AND (`&&`)

### Styling Approach
- Tailwind CSS utility classes (observed in className attributes)
- Custom CSS in `src/index.css` and component-specific `.css` files
- Responsive design with mobile-first breakpoint classes
- Dark mode support through CSS variables and class toggling

### Data Fetching & APIs
- Axios for HTTP requests (configured in `src/api/axios.ts`)
- Service layer abstracts API calls (`src/services/`)
- Custom hooks encapsulate data fetching logic (`src/hooks/`)
- Optimistic updates in state before API confirmation
- Error handling via try/catch and notification system

### Forms & Validation
- Controlled components with useState for form fields
- Custom hook patterns for reusable form logic (see `useItemsPage.ts`, `useEmployees.ts`)
- Validation typically handled at submission time
- Modal dialogs for complex forms (AddEditEmployeeModal, AddItemModal, etc.)

### Testing
- No testing framework configured in package.json
- Manual testing through development server recommended
- Component isolation possible through Storybook-like patterns (not implemented)

## Environment Configuration
- Environment variables in `.env` file (VITE_ prefixed for client access)
- API base URL and other configuration should be managed through env vars
- Development uses Vite's built-in proxy capabilities if needed

## Code Quality
- ESLint configured with React plugin and TypeScript support
- Prettier-like formatting observed (consistent quotes, spacing)
- TypeScript strict mode enabled in tsconfig.json
- Consistent naming conventions (camelCase for variables, PascalCase for components)
- Comments in Arabic and English reflecting team bilingual nature

## Getting Started
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Application will be available at http://localhost:5173
4. Login with any role using the login component (uses mock authentication from store)
5. Role-based views will automatically adjust based on assigned role

## Important Notes
- The application uses mock data extensively for development - replace with real API calls when backend is available
- Financial and accounting modules are fully featured with double-entry bookkeeping concepts
- POS module includes table management, shift tracking, and order processing
- Administration module provides full CRUD operations for all entities
- Responsive design works on both desktop and mobile devices
- Right-to-left (RTL) language support implemented for Arabic interface