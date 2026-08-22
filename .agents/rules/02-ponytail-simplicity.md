# Ponytail Simplicity & Anti-Overengineering Rule

> "Think like the laziest senior engineer in the room. Write less code. Favor standard libraries. Never build what you don't need."

## The Ponytail Decision Ladder
Before writing any new function, class, or dependency, walk down this ladder:

1. **Do we really need this? (YAGNI)**: 
   - Can the existing logic or data structure solve this without adding new components?
   - If not strictly required by user intent, omit it.

2. **Native Platform / Standard Library First**:
   - Python: Use `pathlib`, `dataclasses`, `functools`, `typing`, `asyncio`, `math` before importing third-party micro-packages.
   - Frontend/Browser: Use vanilla Web APIs (`fetch`, `localStorage`, `IntersectionObserver`, CSS Flex/Grid, CSS variables) before adding heavy JS libraries.

3. **Smallest Clean Diff**:
   - Prefer a clean 5-line function over a new class hierarchy.
   - Avoid wrapper functions that merely pass arguments through to another function without adding real value.

4. **Zero Magic**:
   - Avoid dynamic metaclasses, monkey-patching, or opaque reflection when straightforward imperative code does the job.
   - Keep data flows explicit and debuggable.
