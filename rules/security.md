# Security Rules

## Secrets
- Never hardcode API keys, passwords, tokens, or certificates
- Use environment variables or secret managers
- If a secret is accidentally committed, rotate it immediately
- Don't commit .env files, credentials.json, or private keys

## Input Validation
- Validate all external inputs (user input, API responses, file content)
- Sanitize before rendering (prevent XSS)
- Parameterize queries (prevent SQL injection)
- Validate file paths (prevent path traversal)

## Dependencies
- Pin dependency versions
- Audit dependencies for known CVEs regularly
- Prefer well-maintained packages with active communities
- Review new dependency licenses

## Embedded Security
- Disable JTAG/debug ports in production builds
- Enable secure boot chain
- Implement dm-verity for rootfs integrity
- Sign firmware images
- Remove debug-tweaks from production images
- Change default root password before deployment

## Network
- Use HTTPS/TLS for all external communications
- Validate SSL certificates
- Don't disable certificate verification
- Implement proper authentication and authorization

## Code Safety
- No eval() or exec() with dynamic input
- No shell command injection via string concatenation
- Use safe deserialization (no pickle/yaml.load with untrusted data)
- Bounds-check all array/buffer accesses (C/C++)
