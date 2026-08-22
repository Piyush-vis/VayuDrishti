# Superpowers Workflow & Quality Gates

> "Plan thoroughly, execute test-first, and never declare victory without running verification."

## 1. Socratic Brainstorming & Requirement Clarification
- Explore requirements, user personas, and technical constraints before drafting large plans.
- Propose options with clear pros and cons when architectural decisions arise.

## 2. Structured Implementation Planning
- Create an implementation plan with bite-sized tasks.
- For each task, specify:
  - Exact files to be created or modified.
  - Verification commands to test the task.
  - Dependencies on prior tasks.

## 3. Test-Driven Development (TDD)
- **Red**: Write a test exercising the expected behavior or edge case; confirm it fails for the right reason.
- **Green**: Write the minimal production code needed to pass the test.
- **Refactor**: Clean up the code while keeping tests green.

## 4. Verification Gate (R1 Enforcement)
- Never rely on visual code inspection to declare a task complete.
- Always run the test suite or execute API curl/CLI verification commands.
- Check logs and terminal return codes explicitly.
