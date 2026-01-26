# Security Fixes Applied - PsyApp

**Date:** January 26, 2026
**Status:** Fixes Applied

---

## Summary of Changes

This document tracks all security fixes applied to the PsyApp codebase based on the security audit.

---

## CRITICAL FIXES (Completed)

### 1. JWT Algorithm Confusion (CVE-2016-5431)
**File:** `backend/auth.js`
- Added `algorithm: 'HS256'` to `jwt.sign()` (line 44)
- Added `algorithms: ['HS256']` to `jwt.verify()` (line 54)
- **Impact:** Prevents attackers from forging tokens with `alg: "none"`

### 2. Rate Limiting Bypass
**File:** `backend/middleware/rateLimit.js`
- Removed `skipSuccessfulRequests: true` from authLimiter (line 37)
- Increased max to 10 (since we now count all requests)
- **Impact:** Prevents unlimited successful auth attempts

### 3. Unprotected Admin Endpoints
**Files:** Multiple routes
- `backend/routes/leaderboard.js` - Added `authMiddleware` + `adminMiddleware` to POST /update
- `backend/routes/gamification.js` - Added `authMiddleware` + `adminMiddleware` to initialize-achievements
- **Impact:** Prevents unauthorized access to admin functions

### 4. IDOR Vulnerabilities Fixed
**Files:** Multiple routes
- `backend/routes/leaderboard.js:70` - Added auth check, users can only view own data
- `backend/routes/commitReveal.js:427` - Added auth check for statistics endpoint
- `backend/routes/survey.js:22,47` - Added auth checks for baseline endpoints
- **Impact:** Prevents users from accessing other users' data

### 5. Path Traversal in AI Service
**File:** `ai/agents/psi_score_ai.py`
- Added `_validate_image_url()` method with SSRF protection
- Disabled file path access in `_encode_image()` - only HTTPS URLs allowed
- Added content-type validation for images
- **Impact:** Prevents reading arbitrary files from server

---

## HIGH SEVERITY FIXES (Completed)

### 6. Telepathy Routes Authentication
**File:** `backend/routes/telepathy.js`
- Added `authMiddleware` to all session endpoints
- Removed `userId` from request body - now uses `req.user.userId`
- **Endpoints fixed:**
  - POST /sessions
  - POST /sessions/join
  - POST /matchmaking
  - POST /sessions/:sessionId/sender-tags
  - POST /sessions/:sessionId/receiver-response
  - GET /sessions/:sessionId
  - GET /sessions

### 7. Weak Session ID Generation
**File:** `backend/services/socketService.js`
- Changed from `Date.now() + Math.random()` to `crypto.randomUUID()`
- **Impact:** Prevents session ID prediction attacks

### 8. Secure Guest ID Generation
**File:** `backend/routes/commitReveal.js`
- Added `generateSecureGuestId()` function using `crypto.randomUUID()`
- Replaced all `guest_${Date.now()}` patterns
- **Impact:** Prevents guest ID spoofing

### 9. AI Service Security Hardening
**File:** `ai/main.py`
- Added rate limiting middleware (30 req/min per IP)
- Restricted CORS methods to `GET, POST, OPTIONS` only
- Restricted CORS headers to specific allowed headers
- Added security headers middleware (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Added admin authentication for `/evals/run` and `/meta/workflow` endpoints
- Generic error messages instead of leaking internal details
- **Impact:** Multiple attack vector mitigations

### 10. Experiment Type Validation
**File:** `backend/routes/experiments.js`
- Added `VALID_EXPERIMENT_TYPES` whitelist
- Added `validateExperimentType()` function
- Applied validation in POST /create endpoint
- **Impact:** Prevents injection of arbitrary experiment types

### 11. IPFS CID Validation
**File:** `backend/services/ipfsService.js`
- Added `validateCID()` method with regex validation for CIDv0/CIDv1
- Applied validation in `retrieve()` method
- **Impact:** Prevents path traversal via malicious CID values

### 12. Survey Routes Authentication
**File:** `backend/routes/survey.js`
- Added auth to POST /baseline
- Added auth to POST /calibration
- Added auth to POST /feedback
- User ID now comes from `req.user.userId` instead of request body
- **Impact:** Prevents user data manipulation by unauthorized parties

### 13. Webhook Signature Verification
**File:** `backend/routes/aiWebhooks.js`
- Added HMAC-SHA256 signature verification middleware
- Uses constant-time comparison to prevent timing attacks
- **Impact:** Prevents forged webhook requests

### 14. Feed Routes Security
**File:** `backend/routes/feed.js`
- Added rate limiting to /stats endpoint
- Added pagination limit (10000) to prevent unbounded queries
- **Impact:** Prevents DoS via expensive query attacks

---

## MEDIUM SEVERITY FIXES (Completed)

### 15. Error Message Sanitization
- Multiple files: Changed `error: error.message` to generic messages
- Prevents internal error details from leaking to clients

---

## Configuration Required

### Environment Variables to Add

```bash
# backend/.env
WEBHOOK_SECRET=<generate-secure-random-string>

# ai/.env
ADMIN_API_KEY=<generate-secure-random-string>
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://cognosispredict.com
```

Generate secure values:
```bash
# Generate WEBHOOK_SECRET
openssl rand -hex 32

# Generate ADMIN_API_KEY
openssl rand -hex 32
```

---

## Remaining Recommendations

### Still To Do (Future Work)

1. **Move JWT to httpOnly cookies** - Currently in Authorization header (acceptable for SPA but httpOnly cookies are more secure)

2. **Add CSRF tokens** - For additional protection on state-changing endpoints

3. **Database-level locking** - For commit-reveal race condition fix

4. **Audit logging table** - For tracking sensitive operations

5. **Soft deletes** - Replace cascade deletes to prevent data loss

6. **GDPR consent tracking** - Add consent fields to BaselineProfile

7. **Replace CryptoJS** - Use Web Crypto API on frontend for better security

---

## Testing Checklist

After deploying these fixes, verify:

- [ ] JWT authentication still works
- [ ] Rate limiting triggers after threshold
- [ ] Admin endpoints require auth
- [ ] Telepathy sessions require authentication
- [ ] AI service rate limits work
- [ ] Webhook signature verification works
- [ ] IPFS CID validation rejects invalid CIDs
- [ ] Guest IDs are properly UUID format

---

## Files Modified

1. `backend/auth.js` - JWT algorithm fix
2. `backend/middleware/rateLimit.js` - Rate limiting fix
3. `backend/routes/leaderboard.js` - Auth + IDOR fix
4. `backend/routes/gamification.js` - Auth for admin endpoint
5. `backend/routes/survey.js` - Auth for all endpoints
6. `backend/routes/telepathy.js` - Auth for all endpoints
7. `backend/routes/commitReveal.js` - IDOR fix + secure guest IDs
8. `backend/routes/feed.js` - Rate limiting + pagination
9. `backend/routes/experiments.js` - Experiment type validation
10. `backend/routes/aiWebhooks.js` - Webhook signature verification
11. `backend/services/socketService.js` - Secure session IDs
12. `backend/services/ipfsService.js` - CID validation
13. `ai/main.py` - Rate limiting, CORS, auth, security headers
14. `ai/agents/psi_score_ai.py` - Path traversal fix

---

**Security audit report:** See `SECURITY_AUDIT_REPORT.md` for full details.
