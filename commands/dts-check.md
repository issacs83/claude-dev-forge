---
allowed-tools: ""
description: "Device tree validation: syntax, bindings, pinmux conflict detection"
---

# /dts-check — Device Tree Validation

You are executing the `/dts-check` command.

## Steps

1. **Find DTS Files**
   - Search for `.dts` and `.dtsi` files in the project
   - Identify the target DTS based on `$ARGUMENTS` or project configuration

2. **Syntax Check**
   - Verify DTS/DTSI syntax (node structure, property format)
   - Check for missing semicolons, unclosed braces
   - Validate `#address-cells` and `#size-cells` consistency

3. **Binding Validation**
   - Check `compatible` strings against known bindings
   - Verify required properties for each compatible
   - Flag unknown or deprecated compatible strings

4. **Pinmux Conflict Detection**
   - Extract all pin assignments from pinctrl nodes
   - Check for duplicate pin usage across nodes
   - Verify pin function matches datasheet

5. **Include Chain**
   - Trace `#include` / `/include/` chain
   - Verify all included files exist
   - Check for circular includes

6. **Report**
   ```
   DTS Validation: [filename]
   ├── Syntax:     PASS/FAIL (X issues)
   ├── Bindings:   PASS/WARN (X unknown)
   ├── Pinmux:     PASS/FAIL (X conflicts)
   └── Includes:   PASS/FAIL
   ```

## Arguments
- `$ARGUMENTS` — DTS file path or device name (e.g., "mo6-hub", "imx8mp-evk")
