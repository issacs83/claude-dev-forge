# Web Fullstack Coding Rules

## Frontend
- React functional components with hooks
- TypeScript strict mode enabled
- CSS: Tailwind CSS or CSS Modules (no inline styles)
- State management: React Context for simple, Zustand/Redux for complex
- Component file structure: Component.tsx, Component.test.tsx, index.ts

## Backend
- REST API with proper HTTP methods and status codes
- Input validation with Zod/Joi at API boundaries
- Database queries parameterized (no string concatenation)
- Error responses: consistent JSON format

## Testing
- Unit tests for utilities and hooks
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test coverage target: 80%+

## Security
- Authentication: JWT with refresh tokens
- CORS configured for specific origins
- Rate limiting on public endpoints
- Input sanitization for all user inputs
