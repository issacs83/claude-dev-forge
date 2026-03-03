# i.MX8MP BSP Coding Rules

## General
1. Korean communication, English code/comments
2. Commit messages: English with prefix (feat:, fix:, ci:, docs:)
3. KAS configuration: YAML, 2-space indent

## Yocto Rules
- BBFILE_PRIORITY: meta-medit = 10 (highest)
- PACKAGE_CLASSES = "package_ipk"
- Recipe modifications: bbappend first
- Kernel patches: patches/ directory with series

## Kernel/DTS Rules
- DTS includes: .dtsi extension
- Separate DTS overlay per product (mo3-cam, mo6-cam, mo6-hub)
- Pinmux in dedicated .dtsi files

## Build
- KAS command: `KAS_BUILD_DIR=build-<target> kas shell kas/base.yml:kas/<target>.yml`
- Shared DL_DIR and SSTATE_DIR
- Build logs: tmp/work/*/temp/log.do_*
