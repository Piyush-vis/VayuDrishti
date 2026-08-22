# Production-Grade Engineering Habits

> "Build resilient, maintainable, production-ready software with defense-in-depth."

## 1. Defensive Coding & Error Handling
- **Explicit Failure Modes**: Wrap all external I/O (network requests, DB operations, filesystem access, LLM API calls) in `try...except` / `try...catch` blocks with typed error handling.
- **Deterministic Degradation Ladders**:
  - Primary AI / External API → Secondary Cache / Fast Model → Deterministic Local Fallback / Heuristic Template.
  - Never allow an external service timeout to crash the entire application.

## 2. Type Safety & Validation
- Use strict typing: Pydantic models in Python (`BaseModel`), TypeScript interfaces in frontend.
- Validate incoming API payloads at the boundary before processing.
- Avoid loose `dict` / `any` typing for core domain entities.

## 3. Test Isolation & Mocking
- Unit tests must be fast, deterministic, and isolated.
- Mock external network calls in CI/test suites.
- Verify database queries with real DB containers (e.g. MongoDB in Docker) during integration verification.

## 4. Structured Logging & Secrets
- Never log sensitive credentials, API keys, or raw user tokens.
- Use structured log formats (JSON or timestamped log levels: `INFO`, `WARNING`, `ERROR`).
- Include contextual identifiers (e.g., `request_id`, `city_id`, `task_id`) in error logs for rapid debugging.
