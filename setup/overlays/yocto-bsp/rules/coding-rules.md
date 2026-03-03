# Yocto BSP Coding Rules

## General
1. Communication in Korean, code/recipe comments in English
2. Commit messages: English with prefix (feat:, fix:, ci:, docs:)
3. KAS configuration: YAML, 2-space indent

## Yocto Rules
- BBFILE_PRIORITY for custom layer: highest priority
- PACKAGE_CLASSES = "package_ipk"
- Recipe modifications: bbappend first, avoid direct edits
- Kernel patches: manage in patches/ directory as series

## Kernel/DTS Rules
- DTS includes use .dtsi extension
- Separate DTS overlay per product variant
- Pinmux defined in dedicated .dtsi files
- Always validate with /dts-check before commit

## Security Rules
- Production builds: remove debug-tweaks
- Root password: must change before deployment
- Plan dm-verity / secure boot

## Build Rules
- Verify sstate-cache state before full build
- Use shared DL_DIR and SSTATE_DIR
- Build failure logs: tmp/work/*/temp/log.do_*
