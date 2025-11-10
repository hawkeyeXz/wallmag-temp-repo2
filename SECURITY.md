# Security Implementation Guide

## Overview
This application implements comprehensive security measures to protect user data and prevent attacks.

## Authentication & Authorization
- **JWT Tokens**: 7-day expiration with httpOnly cookies
- **Session Management**: Redis-based session tracking and blacklisting
- **Rate Limiting**: 
  - Login: 20 attempts/hour per IP
  - Signup: 60 attempts/hour per IP
  - Account lockout after 5 failed attempts (15 min duration)

## Input Validation & Sanitization
- All user inputs are validated using schema validation
- HTML/Script sanitization to prevent XSS attacks
- File type verification and size limits enforced
- SQL injection prevention through parameterized queries

## File Upload Security
- Document uploads: PDF, DOCX, TXT (max 16MB)
- Image uploads: JPG, PNG (max 10MB each, up to 10 images)
- Designed files: Images/Documents (max 20MB each, up to 20 files)
- Files stored securely using GridFS with MongoDB

## Row Level Security (RLS)
- Published posts: Accessible to all
- Own posts: Accessible only to author + editors/admins
- Drafts/Pending: Accessible only to author
- Admin data: Admin access only

## Role-Based Access Control
- **Student**: Can create posts (create_post)
- **Professor**: Can create posts + manage own content
- **Editor**: Can review submissions (accept_reject_submissions, view_pending_submissions)
- **Publisher**: Can publish posts (publish_post)
- **Admin**: Full access (approve_designs, all permissions)

## CSRF Protection
- SameSite cookies enabled
- CSRF tokens recommended for form submissions
- POST/PUT/DELETE require proper headers

## Data Protection
- Passwords: Bcrypt hashing with salt rounds
- Sensitive data: Encrypted in transit (HTTPS only in production)
- PII: Never logged, minimal exposure
- Session tokens: HttpOnly, Secure, SameSite flags

## Environment Security
- All secrets in .env.local (never committed)
- JWT_SECRET: Minimum 32 characters
- Database credentials: Restricted access
- API keys: Rotated regularly

## Monitoring & Logging
- Failed login attempts tracked
- Account lockout events logged
- File upload attempts monitored
- Suspicious activity alerts (future)

## Compliance
- GDPR ready (user data deletion, export)
- Privacy policy recommended
- Terms of service recommended
