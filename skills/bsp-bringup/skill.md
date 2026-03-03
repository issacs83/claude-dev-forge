---
name: bsp-bringup
description: "Board bring-up checklist and verification for embedded Linux"
---

# BSP Bring-up Skill

## Trigger
Activated for new board bring-up, boot troubleshooting, or peripheral validation.

## Workflow

### Phase 1: Boot Chain
1. SPL/U-Boot compilation
2. Device tree creation/modification
3. Boot media preparation (eMMC, SD, NOR)
4. Serial console verification
5. U-Boot prompt confirmation

### Phase 2: Kernel Boot
1. Kernel configuration
2. Root filesystem preparation
3. Kernel boot to login prompt
4. dmesg analysis for errors/warnings

### Phase 3: Peripheral Validation
1. I2C bus scan
2. SPI device detection
3. USB enumeration
4. Network (Ethernet/WiFi) connectivity
5. GPIO/LED verification
6. Display output (if applicable)

### Phase 4: System Integration
1. Full system image build
2. OTA update mechanism
3. Watchdog configuration
4. Power management
5. Production image hardening
