# Coding Style

## General
- Code comments and variable names: always English
- Communication with user: follow `interaction.md` preference
- No console.log/printf debugging in committed code
- Error handling: never swallow errors silently

## Naming Conventions
- JavaScript/TypeScript: camelCase (variables/functions), PascalCase (classes/components)
- C/C++: snake_case (functions/variables), UPPER_SNAKE_CASE (macros/constants)
- Python: snake_case (functions/variables), PascalCase (classes)
- Shell: snake_case (functions/variables), UPPER_SNAKE_CASE (env vars)
- Files: kebab-case for source, snake_case for configs

## File Size
- Target: 200-400 lines
- Maximum: 500 lines
- If exceeding, split by responsibility

## Function Size
- Target: 10-30 lines
- Maximum: 50 lines
- Single responsibility per function

## Imports/Includes
- Group by: stdlib → external → internal
- Sort alphabetically within groups
- Remove unused imports before commit

## Error Handling
- Always handle errors explicitly
- Propagate errors with context
- Never use empty catch blocks
- Log errors at the boundary, handle at the source

## Constants
- No magic numbers in code
- Extract to named constants
- Group related constants in a dedicated file/module

## C++ Specific
- Header guards: prefer `#pragma once`
- RAII: mandatory for resource management (files, locks, memory, HW handles)
- Smart pointers: `std::unique_ptr` preferred, raw pointers for non-owning references only
- `const` correctness: use `const` wherever possible (params, methods, variables)
- Move semantics: prefer `std::move` for large objects, avoid unnecessary copies
- Namespaces: use project-level namespace, avoid `using namespace std`
- Embedded constraints: consider `-fno-exceptions`, `-fno-rtti` environments
- Initialization: use brace initialization `{}`, avoid narrowing conversions
- Casts: use `static_cast<>`, never C-style casts
- Threads: prefer RAII wrappers (`std::lock_guard`, `std::unique_lock`)
