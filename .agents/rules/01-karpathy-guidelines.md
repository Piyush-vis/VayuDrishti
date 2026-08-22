# Karpathy Coding Guidelines

> "Think before coding. Simplicity first. Surgical changes. Goal-driven execution." — Andrej Karpathy

These 4 core principles govern every code modification in this workspace:

## 1. Think Before Coding
- **No silent assumptions**: If a requirement is ambiguous or has multiple valid interpretations, identify the trade-offs and clarify before writing code.
- **Explicit assumptions**: State any necessary assumptions explicitly in your plan.
- **Surface edge cases**: Proactively identify failure modes, boundary conditions, empty states, and potential race conditions before altering code.

## 2. Simplicity First (KISS & YAGNI)
- **Minimum viable code**: Write the smallest amount of clean code needed to solve the problem.
- **No speculative abstractions**: Avoid creating generic frameworks, unnecessary interfaces, or "future-proofing" that wasn't requested.
- **Standard solutions**: If a task can be done in 20 lines of clear, standard code, never write a 100-line multi-class abstraction layer.

## 3. Surgical Changes
- **Touch only what is necessary**: Do not "clean up" or reformat untouched files, modules, or imports unless explicitly requested.
- **Preserve existing context**: Never delete existing comments, docstrings, or types from unrelated code.
- **Traceable diffs**: Every single line changed must directly connect to the user's specific request.

## 4. Goal-Driven Execution
- **Verifiable success criteria**: Define how success is verified *before* writing code (e.g. "Run test X to ensure input Y yields Z").
- **Step-by-step verification**: Break multi-step tasks into atomic units: modify → execute/test → verify → proceed.
