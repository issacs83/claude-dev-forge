---
allowed-tools: ""
description: "Device flashing helper (UUU/dd/fastboot/openocd)"
---

# /flash — Device Flashing

You are executing the `/flash` command.

## Steps

1. **Detect Flashing Tool**
   | Platform | Tool | Detection |
   |----------|------|-----------|
   | i.MX (NXP) | UUU | `lsusb` for NXP SDP device (1fc9:) |
   | Generic eMMC/SD | dd | Target device specified |
   | Android/Fastboot | fastboot | `fastboot devices` |
   | MCU (ARM) | openocd/pyocd | Debug probe detected |
   | STM32 | STM32CubeProgrammer | ST-Link detected |

2. **Prepare Image**
   - Locate the build output image
   - Verify image integrity (size, checksum if available)

3. **Flash**
   - For UUU: `sudo uuu -b emmc_all <boot_image> <rootfs_image>`
   - For dd: `sudo dd if=<image> of=<device> bs=4M status=progress`
   - For fastboot: `fastboot flash <partition> <image>`

4. **Verify**
   - Check flash success
   - Monitor serial output for boot (if available)

## Safety
- Always confirm target device before flashing
- Show image path and target device for user approval
- Never auto-flash without explicit confirmation

## Arguments
- `$ARGUMENTS` — Optional: image path and/or target device. If empty, auto-detect from build output.
