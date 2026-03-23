---
name: cpp-coding-standards
description: "C++ coding standards for embedded development (C++17)"
---

# C++ Coding Standards

## Target Standard
- C++17 (embedded-compatible subset)
- Compiler: GCC 10+, Clang 12+
- Constraints: `-fno-exceptions`, `-fno-rtti` environments supported

## Memory Management
- Stack allocation preferred over heap
- `std::unique_ptr` for owned heap objects
- `std::shared_ptr` only when shared ownership is genuinely needed
- Raw pointers: non-owning references only, never `delete` a raw pointer
- No `malloc`/`free` in C++ code — use `new`/smart pointers or allocators

## RAII
- All resources (files, locks, HW handles, memory) must use RAII wrappers
- Constructor acquires, destructor releases — no exceptions
- Custom RAII wrappers for hardware resources (GPIO, SPI, I2C handles)

## Const Correctness
- Function parameters: `const&` for read-only, value for small types
- Member functions: `const` if they don't modify state
- Variables: `const` by default, mutable only when needed

## Error Handling
- With exceptions: use exception hierarchy, catch by `const&`
- Without exceptions (`-fno-exceptions`): return `std::optional`, error codes, or Result types
- Never ignore error returns — check or propagate

## Modern C++ Features
- Range-based for loops over index loops
- `auto` for complex types, explicit types for clarity
- Structured bindings for tuple/pair returns
- `std::string_view` for non-owning string references
- `constexpr` for compile-time computation

## Static Analysis
- clang-tidy: enable modernize-*, readability-*, bugprone-*
- cppcheck: enable all checks
- Address Sanitizer (ASan) in debug builds
