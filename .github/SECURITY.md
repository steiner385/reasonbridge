# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly with details of the vulnerability
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Initial Response**: Within 48 hours of your report
- **Status Update**: Within 7 days with our assessment
- **Resolution Timeline**: Varies based on severity and complexity

### Disclosure Policy

- We follow coordinated disclosure practices
- Security fixes will be released before public disclosure
- Credit will be given to reporters (unless they prefer anonymity)

## Security Best Practices

This project follows these security practices:

- **CI/CD Security**: Jenkins pipeline with required status checks
- **Branch Protection**: Main branch is protected with required CI passing
- **Dependency Management**: Regular dependency updates (Dependabot)
- **Code Review**: All changes require PR review process
- **Secrets Management**: Credentials stored in Jenkins Credentials plugin

## Security Updates

Security updates are applied as soon as possible. Monitor the repository for security-related releases.
