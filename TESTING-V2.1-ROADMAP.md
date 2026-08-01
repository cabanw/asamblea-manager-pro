# 🧪 Testing Strategy & v2.1 Roadmap
## Asamblea Manager Pro

---

## I. TESTING STRATEGY (Pre-Event)

### 1. Unit Tests

#### Current State
```bash
$ find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l
→ [Need to check actual count]
```

**Tests to Add (Priority Order):**

```typescript
// tests/lib/quorum.ts
describe('QUORUM_FRACTION', () => {
  it('should equal 2/3', () => {
    expect(QUORUM_FRACTION).toBe(2/3);
  });
  
  it('should calculate threshold correctly', () => {
    const totalMembers = 30;
    const expected = Math.ceil(QUORUM_FRACTION * totalMembers);
    expect(expected).toBe(20); // 2/3 of 30 = 20
  });
});

// tests/lib/featureFlags.ts
describe('VOTING_ENABLED', () => {
  it('should be false for v2.0', () => {
    expect(VOTING_ENABLED).toBe(false);
  });
});
```

#### Edge Function Tests
```typescript
// tests/edge-functions/register-attendance.test.ts
describe('register-attendance', () => {
  it('should reject duplicate registrations', async () => {
    // Call twice with same attendee
    // Expect second to fail or ignore
  });
  
  it('should not generate PIN when VOTING_ENABLED=false', async () => {
    const result = await invoke('register-attendance', { ... });
    expect(result.voter_pin).toBeNull();
  });
  
  it('should fail gracefully when no active session', async () => {
    // No assembly_sessions.status='active'
    // Should return 400
  });
});
```

### 2. Integration Tests

#### Authentication Flow
```typescript
describe('AuthContext', () => {
  it('should load user and roles on mount', async () => {
    // Render AuthProvider
    // Wait for user to load
    // Verify roles populated
  });
  
  it('should clear session on logout', async () => {
    // Login
    // Call signOut()
    // Verify user=null, session=null
  });
});
```

#### Quórum Calculation
```typescript
describe('Quorum Calculation', () => {
  it('Index.tsx shows correct quorum on initial load', async () => {
    // Setup: 30 members total, 20 present (2/3 threshold)
    // Render Index
    // Verify "Quórum Alcanzado"
  });
  
  it('Attendance.tsx updates realtime when new member registers', async () => {
    // Render Attendance.tsx
    // Insert new attendance_record via Supabase
    // Verify UI updates within 500ms
  });
  
  it('QuorumStatus shows consistent value across all pages', async () => {
    // Calculate quorum in Index, Attendance, Register
    // All should show same % and status
  });
});
```

#### Registration Flow
```typescript
describe('Registration (Public)', () => {
  it('PublicRegistration dropdown loads positions', async () => {
    // Render PublicRegistration
    // Wait for positions to load
    // Verify dropdown has options
  });
  
  it('register-attendance inserts attendance_record', async () => {
    // Submit registration form
    // Query attendance_records
    // Verify new record exists
  });
});

describe('Registration (Staff)', () => {
  it('RegisterMember triggers total_active_members update', async () => {
    // Get initial total_active_members
    // Staff adds new member
    // Verify total_active_members increased
  });
});
```

### 3. End-to-End (E2E) Tests

Using Playwright/Cypress (if setup exists):

```typescript
// e2e/event-flow.spec.ts
describe('Event Day Flow', () => {
  
  test('01: Admin creates assembly session', async () => {
    await page.goto('/admin/settings');
    await page.click('button:has-text("New Assembly")');
    await page.fill('input[placeholder="Session name"]', 'Asamblea General');
    await page.click('button:has-text("Create")');
    
    // Verify session created
    const session = await db.from('assembly_sessions')
      .select('*')
      .eq('status', 'active')
      .single();
    expect(session).toBeDefined();
  });
  
  test('02: Public registration via QR', async () => {
    await page.goto('/register?session=' + sessionId);
    
    // Select position
    await page.selectOption('select', 'miembro-activo');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should see "¡Registro Exitoso!" without PIN
    await expect(page.locator('text=¡Registro Exitoso!')).toBeVisible();
    await expect(page.locator('text=PIN')).not.toBeVisible();
  });
  
  test('03: Staff marks attendance', async () => {
    await page.goto('/attendance');
    
    // Search for member
    await page.fill('input[placeholder="Search"]', 'Test Member');
    
    // Mark present
    await page.click('button:has-text("Mark Present")');
    
    // Verify badge shows Present
    await expect(page.locator('text=Present')).toBeVisible();
  });
  
  test('04: Quórum displays correctly', async () => {
    // Add 20 members, mark 14 present (14/20 = 70%, > 2/3)
    
    // Check all pages show quórum alcanzado
    await page.goto('/');
    await expect(page.locator('text=Quórum Alcanzado')).toBeVisible();
    
    await page.goto('/attendance');
    await expect(page.locator('text=Quórum Alcanzado')).toBeVisible();
    
    await page.goto('/register');
    await expect(page.locator('text=Quórum Alcanzado')).toBeVisible();
  });
});
```

### 4. Load Testing

```bash
# Using Artillery.io or k6

# k6 test (install: brew install k6)
k6 run tests/load-test.js

# Load profile:
# - 50 concurrent users
# - 3 minute ramp-up
# - 10 minute steady state
# - Monitor: response times, error rate, DB connections
```

```javascript
// tests/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp-up
    { duration: '5m', target: 50 },   // Steady
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
};

export default function () {
  // Test registration flow
  const res = http.post('https://[project].supabase.co/functions/v1/register-attendance', {
    session_id: 'test-session',
    position_id: 'miembro-activo',
    name: `user-${__VU}-${__ITER}`,
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has id': (r) => r.body.includes('id'),
  });
  
  sleep(1);
}
```

---

## II. PRE-EVENT CHECKLIST

### 48 Hours Before

```bash
# 1. Build & Deploy
npm run build
# Check: dist/ folder exists, no errors
firebase deploy --only hosting

# 2. Database Sanity Check
# Connect to Supabase dashboard
# - Check attendance_records table is empty (or backup archived)
# - Check assembly_sessions status != 'active'
# - Verify RLS policies are in place
# - Backup production database

# 3. Edge Functions
supabase functions deploy register-attendance
# Verify function logs show no errors

# 4. Environment Check
# .env.production has correct URLs
# Firebase project ID correct
# Supabase project ID correct
```

### 24 Hours Before

```bash
# 1. Run E2E tests
npm run test:e2e

# 2. Load test staging
k6 run tests/load-test.js --vus 50 --duration 5m

# 3. Cross-browser check
# Test on: Chrome, Firefox, Safari, Edge
# Check on: Windows, Mac, iPhone, Android

# 4. QR Code Test
# Print QR codes
# Scan with actual devices
# Verify link resolves to correct page
```

### 2 Hours Before Event

```bash
# 1. Fresh Deploy
npm run build
firebase deploy --only hosting

# 2. Smoke Test
# - Open app in incognito (fresh cache)
# - Login as admin
# - Verify all pages load
# - Check console for errors

# 3. Check System Status
# - Firebase Hosting: Green
# - Supabase: Green
# - No alerts/warnings

# 4. Staff Brief
# - Demo registration flow
# - Show backup process (manual list)
# - Provide Discord/Slack for live support
```

---

## III. LIVE EVENT MONITORING

### Dashboard to Watch (Real-time)

```
1. Firebase Analytics
   - Active users (target: 50-100)
   - Page views/minute
   - Error rate
   
2. Supabase Dashboard
   - Database size (should not grow huge)
   - Realtime connections (< 100)
   - Query performance (< 500ms p95)
   
3. Browser Console (on admin device)
   - No JS errors
   - No network errors
   - No auth errors
   
4. Application Metrics
   - Current attendance count
   - Quórum status
   - Last registration timestamp
```

### Alerts to Set Up

```yaml
# Firebase
- High error rate (> 5%) for 5 min
- Response time p95 > 2 seconds
- Sudden traffic drop (might indicate outage)

# Supabase  
- Database size > 1GB
- Row count in attendance_records > 1000
- Query slow (p95 > 1 second)
- Auth failures > 10% of requests

# Application
- Quórum calculation differs from manual count
- Duplicate registrations detected
- Member appears in attendance_records multiple times
```

---

## IV. V2.1 ROADMAP (Post-Event)

### Phase 1: Voting Reactivation (Week 1-2)

#### Code Changes Required

```typescript
// 1. Enable voting flag
// src/lib/featureFlags.ts
export const VOTING_ENABLED = true;  // ← Change from false

// 2. Verify PIN generation still works
// In RegisterMember.tsx and register-attendance/index.ts
if (VOTING_ENABLED && isActive) {
  voter_pin = generateVoterPin();
  // Send SMS via Twilio (verify credentials)
}

// 3. Test voting booth end-to-end
// VotingBooth.tsx → NominationBooth → Election voting

// 4. Verify election results page works
// ElectionResults.tsx with real data

// 5. Test ballot secrecy
// Verify vote is NOT linked to voter_pin via SQL query
```

#### QA Checklist for Voting

```
- [ ] PIN generation works for active members
- [ ] SMS delivery verified (check Twilio logs)
- [ ] Election creation flow works
- [ ] Nomination booth opens correctly
- [ ] Vote submission works
- [ ] Vote cannot be modified after submission
- [ ] Results cannot be viewed before election closes
- [ ] Ballot secrecy: query votes, cannot identify voter
- [ ] Admin cannot see individual votes (only results)
```

#### Database Verification

```sql
-- Verify election_votes table exists and has RLS
SELECT * FROM information_schema.tables 
WHERE table_name = 'election_votes';

-- Verify RLS policies on election_votes
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'election_votes';

-- Verify no way to link vote to voter
SELECT v.id, v.voter_pin, v.vote 
FROM election_votes v 
WHERE voter_pin IS NOT NULL;  -- Should return NULL voter_pins
```

### Phase 2: Security Hardening (Week 2-3)

#### RLS Policy Audit

```typescript
// For EVERY table, verify:
// 1. Who can SELECT? (should be minimal)
// 2. Who can INSERT? (should be minimal)
// 3. Who can UPDATE? (should be minimal)
// 4. Who can DELETE? (should be minimal)

// Template test:
describe('RLS: members table', () => {
  it('public user cannot read members', async () => {
    const { data } = await anonClient
      .from('members')
      .select('*');
    expect(data).toBeNull();  // Public blocked
  });
  
  it('admin can read members', async () => {
    const { data } = await adminClient
      .from('members')
      .select('*');
    expect(data.length).toBeGreaterThan(0);
  });
});
```

#### Rate Limiting Implementation

```typescript
// supabase/functions/register-attendance/index.ts

import { RateLimiter } from 'npm-module'; // or implement custom

const limiter = new RateLimiter({
  keyGenerator: (req) => req.headers.get('x-forwarded-for'),
  max: 10,  // Max 10 requests
  windowMs: 60 * 1000,  // Per 1 minute
});

export default async (req: Request) => {
  const result = await limiter.check(req);
  if (!result.success) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // ... rest of function
};
```

#### Audit Logging

```typescript
// Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL,
  table_name text NOT NULL,
  operation text NOT NULL,  -- INSERT, UPDATE, DELETE
  record_id text NOT NULL,
  changed_columns jsonb,
  old_values jsonb,
  new_values jsonb,
  actor_id uuid,
  timestamp timestamp default now(),
  ip_address inet
);

// Create trigger to log all changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, operation, record_id, ...)
  VALUES (TG_TABLE_NAME, TG_OP, NEW.id, ...);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to critical tables
CREATE TRIGGER audit_attendance_records
AFTER INSERT OR UPDATE OR DELETE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### Phase 3: Feature Enhancements (Week 3-4)

#### Reporting Improvements

```typescript
// src/pages/AdminReports.tsx - Add exports

export function ReportGenerator() {
  const exportPDF = async () => {
    const doc = new PDFDocument();
    
    // Header
    doc.fontSize(20).text('Assembly Report', 100, 100);
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
    
    // Attendance table
    const attendance = await fetchAttendance();
    doc.table(attendance, {
      width: 500,
      columnSpacing: 5,
      rowHeight: 25,
      headers: ['Name', 'Position', 'Status'],
    });
    
    // Quórum section
    doc.addPage()
      .fontSize(14).text('Quórum Status')
      .fontSize(12).text(`Required: 2/3 of ${totalMembers} = ${quorumThreshold}`);
    
    return doc.finalize();
  };
  
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    
    sheet.columns = [
      { header: 'Name', key: 'name' },
      { header: 'Position', key: 'position' },
      { header: 'Status', key: 'status' },
    ];
    
    sheet.addRows(attendance);
    return workbook.xlsx.writeBuffer();
  };
}
```

#### Member Management UI

```typescript
// Add member lifecycle management
// - Activate/Deactivate member
// - Edit member info
// - Delete member (soft delete)
// - Audit trail of changes

// src/components/MemberManager.tsx
export function MemberManager() {
  const handleActivate = async (memberId: string) => {
    await supabase
      .from('members')
      .update({ is_active: true })
      .eq('id', memberId);
    // Re-calculate quórum!
  };
  
  const handleDeactivate = async (memberId: string) => {
    await supabase
      .from('members')
      .update({ is_active: false })
      .eq('id', memberId);
    // Re-calculate quórum!
  };
}
```

### Phase 4: Performance Optimization (Week 4)

#### Code Splitting

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'voting': ['src/pages/VotingBooth', 'src/pages/NominationBooth'],
          'elections-admin': ['src/pages/AdminElections', 'src/pages/ElectionDetailAdmin'],
          'ui': ['src/components/ui/'],
        },
      },
    },
  },
};

// Lazy load voting module
const VotingBooth = lazy(() => import('./pages/VotingBooth'));

// In route rendering:
{VOTING_ENABLED && <Suspense><VotingBooth /></Suspense>}
```

#### Caching Strategy

```typescript
// src/lib/cache.ts
export class AppCache {
  static async getPositions() {
    // Check localStorage first
    const cached = localStorage.getItem('positions');
    if (cached) return JSON.parse(cached);
    
    // Fetch from DB
    const positions = await supabase.from('positions').select();
    
    // Cache for 1 hour
    localStorage.setItem('positions', JSON.stringify(positions));
    setTimeout(() => localStorage.removeItem('positions'), 3600000);
    
    return positions;
  }
  
  static clearOnLogout() {
    localStorage.removeItem('positions');
    // ... clear other cached data
  }
}
```

---

## V. ROLLBACK PROCEDURES

### If Voting Reactivation Breaks Something

```bash
# 1. Immediate
git revert <commit-that-enabled-voting>
npm run build
firebase deploy

# 2. In code
export const VOTING_ENABLED = false;

# 3. Notify users
# "Voting temporarily disabled for technical reasons"

# 4. Debug
# Check logs in Supabase dashboard
# Check Firebase error reporting
# Check Edge Function logs
```

### If Database Becomes Corrupted

```bash
# 1. Restore from backup
supabase db restore --backup-ref <backup-id>

# 2. Or use point-in-time recovery
supabase db restore --recovery-point 2026-08-01T14:30:00Z

# 3. Verify data integrity
SELECT COUNT(*) FROM attendance_records;
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM assembly_sessions;
```

---

## 🎯 Success Criteria for v2.1

- [ ] Voting enabled and tested
- [ ] No security vulnerabilities in audit
- [ ] All rate limiting in place
- [ ] Audit logging implemented
- [ ] Performance benchmarks met (p95 < 500ms)
- [ ] E2E tests pass (100%)
- [ ] Load tested to 200+ concurrent users
- [ ] Security audit by external party
- [ ] Documentation updated
- [ ] Team trained on new features

---

**Status: Ready for v2.0 event. v2.1 planning can begin after event debrief.**
