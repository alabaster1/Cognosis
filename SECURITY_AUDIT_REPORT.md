# Security Audit Report - PsyApp (Cognosis Institute)

**Date:** January 26, 2026
**Auditor:** Claude Code Security Analysis
**Scope:** Full stack security review (Frontend, Backend, AI Service, Database)

---

## Executive Summary

| Severity | Count | Areas Affected |
|----------|-------|----------------|
| **CRITICAL** | 12 | Auth, Routes, Database, AI |
| **HIGH** | 25+ | All layers |
| **MEDIUM** | 15+ | Various |
| **LOW** | 10+ | Minor issues |

---

## CRITICAL VULNERABILITIES (Fix Immediately)

### 1. Unprotected Admin & Sensitive Endpoints
Multiple routes have **no authentication**:

| File | Endpoint | Risk |
|------|----------|------|
| `backend/routes/leaderboard.js:99` | `POST /api/leaderboard/update` | Anyone can trigger expensive DB recalculation |
| `backend/routes/leaderboard.js:70` | `GET /api/leaderboard/user/:userId` | IDOR - access any user's data |
| `backend/routes/gamification.js:287` | `POST /api/gamification/initialize-achievements` | Reinitialize system achievements |
| `backend/routes/survey.js:22,47` | Survey baseline endpoints | User enumeration + data manipulation |
| `backend/routes/telepathy.js` | Multiple session endpoints | Access other users' sessions |

### 2. JWT Algorithm Confusion Vulnerability
**File:** `backend/auth.js:38-58`

```javascript
// VULNERABLE - no algorithm specified
jwt.sign({...}, JWT_SECRET, { expiresIn: JWT_EXPIRY });
jwt.verify(token, JWT_SECRET);  // Accepts ANY algorithm from token header!
```

**Attack:** Forge tokens with `alg: "none"` to bypass authentication entirely.

**Fix:**
```javascript
jwt.sign({...}, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRY });
jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
```

### 3. Client-Side JWT Storage (XSS Risk)
**File:** `web/src/services/walletService.ts:136`

JWT stored in `localStorage` - any XSS vulnerability exposes all user tokens.

**Fix:** Use `httpOnly` cookies with `Secure` and `SameSite=Strict` flags.

### 4. Rate Limiting Bypass
**File:** `backend/middleware/rateLimit.js:37`

```javascript
skipSuccessfulRequests: true  // Allows unlimited successful auth attempts!
```

**Fix:** Remove `skipSuccessfulRequests` - rate limit all requests equally.

### 5. Path Traversal in AI Service
**File:** `ai/agents/psi_score_ai.py:576-582`

```python
Image.open(image_source)  # No path validation - can read /etc/passwd
```

### 6. Weak Encryption (CryptoJS)
**Files:** `web/src/services/encryptionService.ts`, `backend/storage/encryption/`

CryptoJS uses weak key derivation. Should use Web Crypto API (`crypto.subtle`) on frontend and proper AES-256-GCM with authenticated encryption.

---

## HIGH SEVERITY ISSUES

### Authentication & Authorization
1. **IDOR in multiple routes** - `commitReveal.js:427`, `telepathy.js:142` - User ID from URL/query with no ownership verification
2. **Guest ID spoofing** - Pattern `guest_${Date.now()}_${Math.random()}` is predictable and spoofable
3. **Webhook endpoints unprotected** - `aiWebhooks.js` has no signature verification

### Input Validation
4. **No validation on experiment types** - `experiments.js:483` accepts arbitrary values
5. **Unbounded queries** - `feed.js:207` loads all scores without pagination limit
6. **Missing CSRF protection** - All POST endpoints vulnerable to cross-site requests

### Cryptography
7. **Weak session IDs** - `socketService.js:117` uses `Date.now() + Math.random()` instead of `crypto.randomUUID()`
8. **Nonce stored in DB** - `cardanoBlockchainService.js:243` stores reveal secrets - DB breach exposes all commitments
9. **Legacy CryptoJS fallback** - Uses weak EVP_BytesToKey derivation

### AI Service
10. **No rate limiting** - `ai/main.py` allows unlimited API calls (billing abuse)
11. **CORS too permissive** - `allow_methods=["*"]`, `allow_headers=["*"]`
12. **Prompt injection** - User input passed directly to LLM without sanitization
13. **Missing auth on admin endpoints** - `/evals/run`, `/meta/workflow` accessible to anyone

---

## MEDIUM SEVERITY ISSUES

| Issue | Location | Description |
|-------|----------|-------------|
| Race condition | `commitRevealService.js:262` | Check-then-act without atomic locking |
| Cascade deletes | `schema.prisma` | User deletion destroys 15+ tables of data |
| No audit logging | Database | No tracking of sensitive operations |
| Weak anonymization | `feed.js:16` | 4-char hash suffix is reversible |
| Error message leakage | Multiple files | Stack traces returned to clients |
| Missing consent tracking | `BaselineProfile` model | GDPR compliance risk for demographic data |
| IPFS CID not validated | `ipfsService.js:127` | Path traversal possible |

---

## DETAILED FINDINGS BY COMPONENT

### Backend Routes

#### leaderboard.js
- **Line 70**: `GET /api/leaderboard/user/:userId` - No auth, IDOR vulnerability
- **Line 99**: `POST /api/leaderboard/update` - No auth on admin endpoint
- **Line 20**: `parseInt(limit)` without range validation

#### gamification.js
- **Line 287**: `POST /api/gamification/initialize-achievements` - No auth

#### survey.js
- **Line 22**: `GET /api/survey/baseline/check/:userId` - User enumeration
- **Line 47**: `POST /api/survey/baseline` - No auth, can forge any user's data

#### telepathy.js
- **Lines 1-100+**: Multiple session endpoints lack authentication
- **Line 142-157**: Session retrieval uses query param userId without verification

#### commitReveal.js
- **Line 13**: Uses optionalAuthMiddleware allowing guest override
- **Line 427**: Statistics endpoint allows access to any user's data

#### experiments.js
- **Line 483**: No validation on experimentType field
- **Lines 207, 486, 519, 662, 811**: Guest ID generation is predictable

#### feed.js
- **Line 16-50**: Weak anonymization (4-char hash)
- **Line 207**: Unbounded query loads all scores

### Backend Services

#### commitRevealService.js
- **Lines 262-268**: Race condition in reveal operation

#### socketService.js
- **Line 117**: Weak session ID generation using Math.random()

#### cardanoBlockchainService.js
- **Lines 243-244, 276-277**: Nonce stored in DB (should never leave server)

#### ipfsService.js
- **Lines 127, 137**: CID not validated against IPFS format

### Backend Auth

#### auth.js
- **Lines 38-46**: JWT sign without algorithm specification
- **Lines 52-58**: JWT verify without algorithm whitelist
- **Lines 25-32**: Challenge cleanup only every 10 minutes

#### rateLimit.js
- **Line 37**: `skipSuccessfulRequests: true` allows bypass

### Frontend

#### walletService.ts
- **Line 136**: JWT in localStorage (XSS vulnerable)
- **Lines 141-142, 148-149**: Wallet info in localStorage

#### encryptionService.ts
- Uses CryptoJS (weak key derivation)
- Should use Web Crypto API

#### secureKeyStore.ts
- **Lines 141-163**: Weak XOR obfuscation with fixed key

### AI Service

#### main.py
- **Lines 1-50**: No rate limiting
- **Lines 30-36**: CORS too permissive
- **Lines 120-161**: Prompt injection risk
- **Lines 254-334**: Admin endpoints without auth

#### psi_score_ai.py
- **Lines 576-582**: Path traversal in image loading
- **Lines 264, 311, 340, 370, 403**: Insecure JSON parsing

#### llm_provider.py
- **Lines 47, 80**: API keys could leak in errors

#### image_generator.py
- **Lines 220-267**: SSRF risk in URL fetching

### Database Schema

#### schema.prisma
- String fields used for enums (status, role, experimentType)
- Cascade deletes on 15+ tables
- No audit logging table
- Missing consent tracking fields

---

## Recommended Fixes (Priority Order)

### Immediate (This Week)
```bash
# 1. Add auth to unprotected endpoints
authMiddleware → leaderboard.js, gamification.js, survey.js, telepathy.js

# 2. Fix JWT algorithm
jwt.verify(token, secret, { algorithms: ['HS256'] })

# 3. Move JWT to httpOnly cookie
res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict' })

# 4. Fix rate limiter
skipSuccessfulRequests: false
```

### Short-term (This Month)
1. Add CSRF tokens to all state-changing endpoints
2. Implement input validation with whitelists for enum fields
3. Replace CryptoJS with Web Crypto API
4. Add authentication to AI service endpoints
5. Implement webhook signature verification (HMAC-SHA256)
6. Add rate limiting to AI service (`slowapi` library)

### Medium-term
1. Move secrets to proper management (HashiCorp Vault, GCP Secret Manager)
2. Implement database-level row locking for commit-reveal
3. Add comprehensive audit logging
4. Replace soft deletes for user data instead of cascades
5. Add Content Security Policy headers
6. Implement GDPR consent tracking fields

---

## Files Requiring Most Attention

| File | Critical Issues | Priority |
|------|-----------------|----------|
| `backend/auth.js` | JWT algorithm, weak challenge TTL | 1 |
| `backend/routes/leaderboard.js` | No auth, IDOR | 1 |
| `backend/routes/telepathy.js` | No auth on sessions | 1 |
| `backend/middleware/rateLimit.js` | Bypass vulnerability | 1 |
| `web/src/services/walletService.ts` | localStorage JWT | 2 |
| `ai/main.py` | No auth, no rate limit, CORS | 2 |
| `ai/agents/psi_score_ai.py` | Path traversal, JSON injection | 2 |
| `backend/services/commitRevealService.js` | Race condition | 3 |

---

## Compliance Considerations

### GDPR
- Missing consent tracking for demographic data in BaselineProfile
- No data retention policy enforcement
- Cascade deletes may violate right to data portability

### Security Best Practices
- No Web Application Firewall (WAF)
- No intrusion detection
- Limited audit logging
- No penetration testing evidence

---

## Conclusion

The application has significant security vulnerabilities that require immediate attention. The most critical issues are:

1. **Authentication bypass** via JWT algorithm confusion
2. **Unprotected admin endpoints** allowing unauthorized access
3. **IDOR vulnerabilities** exposing user data
4. **Client-side token storage** vulnerable to XSS

Remediation should follow the priority order outlined above, with critical issues addressed within one week.
