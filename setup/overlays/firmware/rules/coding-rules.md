# Firmware Coding Rules

## C/C++ Standards
- C11 for embedded C, C++17 for C++
- MISRA C guidelines for safety-critical code
- No dynamic memory allocation in ISR context
- All variables initialized at declaration

## Naming Conventions
- Functions: module_action_object (e.g., spi_write_register)
- Macros: MODULE_NAME (e.g., GPIO_PIN_HIGH)
- Types: module_type_t (e.g., uart_config_t)
- Files: module_name.c/.h

## Architecture
- HAL abstraction for all peripheral access
- No direct register access outside HAL layer
- ISR handlers: minimal work, defer to task/thread
- State machines for protocol implementations

## Safety
- Bounds check all array accesses
- Watchdog timer for all production builds
- Stack overflow detection enabled
- Assert macros for debug builds
- CRC/checksum for all stored data

## Build
- Compiler warnings: -Wall -Wextra -Werror
- Static analysis: cppcheck or PC-lint
- Code size optimization: -Os for production
