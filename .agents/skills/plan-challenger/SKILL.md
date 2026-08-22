---
name: plan-challenger
description: >-
  Adversarial planning review and risk critique. Use when reviewing architecture plans,
  evaluating system design before coding, auditing critical migrations, or stress-testing assumptions.
---

# Plan Challenger & Adversarial Critique

This skill acts as a senior technical reviewer / devils' advocate that rigorously evaluates plans, designs, and architectural proposals *before* implementation begins.

---

## The 6-Point Stress Test Checklist

When reviewing any plan or proposal, evaluate against these criteria:

1. **Failure Modes & Fallbacks**:
   - What happens if a third-party API or database query times out, returns a 429, or errors?
   - Is there a deterministic, zero-dependency fallback pathway defined?

2. **State & Concurrency**:
   - What happens if two concurrent requests hit this endpoint simultaneously?
   - Are there race conditions, stale cache reads, or database locking issues?

3. **Data Edge Cases**:
   - How does the code behave when inputs are `None`, `[]`, empty strings, NaN values, or extremely large payloads (100MB+)?
   - Are there schema mismatches between backend JSON serialization and frontend TypeScript models?

4. **Resource Constraints & Quotas**:
   - Does this plan increase memory usage, loop unbounded API calls, or exceed LLM token rate limits?

5. **Scope & YAGNI Violations**:
   - Does the plan introduce abstractions, config options, or files that aren't strictly necessary for the immediate goal?

6. **Verification Completeness**:
   - Are the verification steps concrete and automated (e.g. specific curl commands, unit test files) rather than subjective?
