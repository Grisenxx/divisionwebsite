# 🔐 Security Implementation Guide

## Security Features Implemented

### ✅ 1. Rate Limiting
- **Application Updates**: Max 10 requests per minute per IP
- **Search API**: Max 5 searches per 30 seconds per IP  
- **Protection against**: DoS attacks, spam, brute force

### ✅ 2. Input Validation & Sanitization
- **Zod Schema Validation**: Ensures data types and formats are correct
- **XSS Prevention**: Removes malicious HTML/JavaScript from input
- **NoSQL Injection Prevention**: Sanitizes database queries
- **Regex Escaping**: Prevents regex injection in search

### ✅ 3. Admin Authentication
- **Role-based Access**: Only users with admin roles can modify applications
- **Admin Info Validation**: Verifies Discord ID format and admin details
- **Audit Trail**: Tracks who made changes and when

### ✅ 4. Database Security
- **Sanitized Queries**: All inputs are cleaned before database operations
- **Limited Results**: Search results capped at 50 items
- **Audit Fields**: Tracks `updatedAt` and `updatedBy` for all changes

## Environment Variables Added

```bash
# Security Settings
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-random-string
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
ADMIN_ROLE_IDS=1427628590580895825,1427634524673544232,1427634628742615171,1427634558718971974,1427634587135119411
```

## Security Headers & Responses

### Rate Limiting Response:
```json
{
  "error": "For mange requests. Prøv igen senere."
}
```
Status: `429 Too Many Requests`  
Header: `Retry-After: 60`

### Validation Error Response:
```json
{
  "error": "Ugyldig input data"
}
```
Status: `400 Bad Request`

### Authentication Error Response:
```json
{
  "error": "Ingen admin rettigheder"
}
```
Status: `403 Forbidden`

## Security Best Practices Applied

### 🛡️ Input Sanitization
- Removes `<script>` tags and JavaScript
- Strips event handlers (`onclick`, etc.)
- Escapes special regex characters
- Validates Discord ID format (`/^\d{17,19}$/`)

### 🚫 Attack Prevention
- **XSS**: HTML/JS sanitization
- **NoSQL Injection**: Query sanitization  
- **DoS**: Rate limiting per IP
- **Brute Force**: Limited login attempts
- **Data Leakage**: Sensitive fields filtered

### 📝 Audit Trail
All admin actions now log:
- Who performed the action (`updatedBy`)
- When it was performed (`updatedAt`)
- What was changed (status, rejection reason)

## Testing Security

### Test Rate Limiting:
```bash
# Make 11 quick requests - 11th should be rate limited
for i in {1..11}; do curl -X PATCH http://localhost:3000/api/applications/test; done
```

### Test Input Validation:
```bash
# Should be rejected
curl -X PATCH http://localhost:3000/api/applications/test \
  -H "Content-Type: application/json" \
  -d '{"status": "invalid_status"}'
```

### Test XSS Prevention:
```bash
# Script tags should be removed
curl -X GET "http://localhost:3000/api/applications/search?q=<script>alert('xss')</script>"
```

## Security Monitoring

Monitor these logs for security issues:
- `429 Too Many Requests` - Potential DoS attack
- `400 Bad Request` - Invalid input attempts  
- `403 Forbidden` - Unauthorized access attempts
- `Ugyldig input data` - Validation failures

## Future Security Improvements

1. **JWT Authentication**: Replace session-based auth with proper JWT tokens
2. **CSRF Protection**: Add CSRF tokens for form submissions
3. **HTTPS Enforcement**: Ensure all traffic is encrypted
4. **Security Headers**: Add CSP, HSTS, and other security headers
5. **Database Encryption**: Encrypt sensitive data at rest
6. **API Key Authentication**: For webhook endpoints
7. **Geo-blocking**: Block requests from suspicious countries
8. **Honeypots**: Detect bot submissions