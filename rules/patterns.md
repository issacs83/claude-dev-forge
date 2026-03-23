# Design Patterns

## General Patterns

### Skeleton Project
- Reuse existing project structures as templates
- Copy working build configs rather than writing from scratch
- Embedded: use existing Yocto recipe, CMakeLists.txt, Makefile as skeleton

### Repository / HAL Pattern
- Abstract data access and hardware interfaces behind clean APIs
- Swap implementations without changing callers
- Embedded: HAL layer separates driver logic from application logic
- Test with mock HAL, deploy with real HAL

### State Machine
- Use explicit state machines for complex control flows
- Define states, transitions, and guards clearly
- Embedded: ISR-safe state transitions, avoid blocking in state handlers

### Ring Buffer
- Use for producer-consumer communication (DMA, IPC, logging)
- Define capacity, head/tail pointers, overflow policy
- Embedded: cache-line aligned, lockless where possible

### Observer / Callback
- Decouple event sources from handlers
- Use function pointers (C) or std::function (C++)
- Embedded: keep callbacks short, defer heavy work to task context

## API Response Pattern
- Standard envelope: `{ success, data, error, metadata }`
- Always include error context (code, message, details)
- Version APIs from the start

## When NOT to Abstract
- Don't create helpers for one-time operations
- Three similar lines > premature abstraction
- Don't design for hypothetical future requirements
