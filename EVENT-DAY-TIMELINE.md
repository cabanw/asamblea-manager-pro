# 📅 Event Day Timeline & Live Monitoring Guide
## Asamblea General FIADAH — August XX, 2026

---

## PRE-EVENT CHECKLIST (Day Before + Day Of)

### 24 Hours Before

```
TIME    TASK                                    OWNER           STATUS
─────────────────────────────────────────────────────────────────────
12:00   Final code review & build              Engineering     [ ]
        └─ npm run build
        └─ firebase deploy --only hosting
        
14:00   Database backup                        DevOps          [ ]
        └─ Create Supabase backup
        └─ Export attendance_records (should be empty)
        
15:00   Edge Function deployment              Engineering     [ ]
        └─ supabase functions deploy register-attendance
        └─ Test with sample registration
        
16:00   QR Code generation & printing         Operations      [ ]
        └─ Print 5 sets of QR codes
        └─ Test each QR on 2+ devices
        
17:00   Staff training                        Event Manager   [ ]
        └─ Demo registration flow
        └─ Show backup process
        └─ Provide support contact info
        
18:00   Final system check                    Engineering     [ ]
        └─ Verify Firebase, Supabase, Edge Functions up
        └─ Check zero errors in logs
```

### 2 Hours Before Event

```
TIME    TASK                                    OWNER           STATUS
─────────────────────────────────────────────────────────────────────
[T-120] Final deploy if any last changes       Engineering     [ ]
        
[T-90]  Open admin dashboard in browser        Tech Support    [ ]
        └─ Clear browser cache
        └─ Open in incognito window
        └─ Verify all pages load
        
[T-60]  Check Firebase & Supabase dashboards   Engineering     [ ]
        └─ No warnings/errors
        └─ Database connections: green
        └─ Realtime connections: 0 (no users yet)
        
[T-45]  Distribute QR codes to stations        Operations      [ ]
        └─ Laminated copies at each entry point
        └─ Tablets/devices at registration stations
        
[T-30]  Brief staff on live event procedures   Event Manager   [ ]
        └─ Walk through registration process
        └─ Show how to manually register if needed
        └─ Provide Discord/Slack channel for issues
        
[T-15]  All staff in position, devices ready   Operations      [ ]
        └─ Registration station 1: online
        └─ Registration station 2: online (backup)
        └─ Admin tablet at front for monitoring
        └─ Backup paper registration form ready
        
[T-0]   Event begins!                          Event Manager   [ ]
        └─ Open registration
        └─ Staff monitoring live
        └─ Engineering team on standby
```

---

## LIVE EVENT MONITORING (Real-Time)

### Console to Watch (Admin Device)

**URL:** `https://asamblea-manager-pro-148-cf9ee.web.app`

```
SECTION 1: Quick Stats (top of page)
┌─────────────────────────────────────┐
│ Active Members: [COUNT]             │
│ Present: [COUNT]                    │
│ Quórum: [STATUS] ([%]%)             │
│ Last Registration: [TIME]           │
└─────────────────────────────────────┘

SECTION 2: Quórum Status Card
┌─────────────────────────────────────┐
│ Estado del Quórum                   │
│ ┌─────────────────────────────────┐ │
│ │ ████████████░░░░░░░░░░░░░░░░░░ │ │  <- Progress bar
│ │ Presentes: X / Y miembros        │ │
│ │ Se requiere 2/3 = Z miembros     │ │
│ │ [Quórum Alcanzado] ✓             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

SECTION 3: Recent Registrations
┌─────────────────────────────────────┐
│ Últimas Asistencias:                │
│ 14:05 - Juan Pérez (Miembro Activo) │
│ 14:04 - María García (Invitado)     │
│ 14:03 - Carlos López (Miembro)      │
│ [REFRESH] to update                 │
└─────────────────────────────────────┘
```

### Monitoring Checklist (Every 5 Minutes)

```
⏱️  5 MIN INTERVAL CHECK:
  ✓ Attendance count increasing?
  ✓ Quórum percentage moving up?
  ✓ No error messages in console?
  ✓ All tabs responsive (< 1 sec load)?
  ✓ Firebase/Supabase dashboards: green?

🔴 IF ANY RED FLAG:
  → Take screenshot
  → Note exact time & what happened
  → Contact engineering on Slack/Discord
  → Prepare to switch to manual backup system
```

### Backend Dashboards (Engineering Monitoring)

#### Firebase Console
```
URL: https://console.firebase.google.com/

Watch these metrics:
- Authentication: Active user count (target: 10-20 staff)
- Realtime Database: Connected clients (target: 50-100)
- Functions: Invocation count rising (register-attendance called)
- Hosting: Request count, avg response time (< 500ms)
- Error Reporting: Zero errors (or expected errors only)
```

#### Supabase Dashboard
```
URL: https://app.supabase.com/project/[PROJECT_ID]/

Watch these metrics:
- Database: No warnings, queries < 500ms
- Realtime: Active subscriptions (attendance_records)
- Storage: No issues
- Vector DB: N/A for this project
- Logs: No ERROR or FATAL entries

Critical tables to monitor:
- attendance_records: Row count increasing
- assembly_sessions: Should be 1 active session
- members: Should stay constant (or small new additions)
```

---

## EXPECTED EVENT FLOW

### Timeline & What to Expect

```
TIME        EVENT                           EXPECTED STATS
──────────────────────────────────────────────────────────────
14:00       Event begins                    0 attendees, 0% quórum
            
14:05-14:15 Registration opens              5-10 registrations
            (first rush)                    Quórum: X% (low)
            
14:15-14:45 Steady registrations            +2-3 per minute
                                           Quórum: Y% (increasing)
                                           
14:45       "Warning: Not yet quórum"       Present: ~60%
            Staff announces need for more   Still need ~5-10 more
            
14:50-15:00 Last registrations              +1-2 per minute
                                           Quórum: Z% (approaching)
                                           
15:00       ✅ QUÓRUM ACHIEVED!             Present: 2/3+ = ALCANZADO
            Announcement made
            Event proceedings begin
            
15:00-17:00 Registration continues          Sporadic registrations
            (stragglers, departures)        Quórum maintained
            
17:00       Event ends                      Final attendance count
            System closes
```

### Success Indicators

```
✅ THINGS THAT SHOULD HAPPEN:
- Attendance count steadily increases
- Quórum moves from "Sin Quórum" → "Quórum Alcanzado"
- No error messages in browser console
- All pages load < 1 second
- Firebase/Supabase dashboards stay green
- Zero database errors
- No duplicate registrations (verify later)

🔴 RED FLAGS (Immediate Action Required):
- Attendance count drops or doesn't increase
- Quórum calculation jumps unexpectedly
- "Network error" messages
- Staff can't login or access admin panel
- Registration takes > 5 seconds
- Firebase/Supabase showing warnings
- Console errors (SQL, auth, realtime)
- Duplicate registrations detected
```

---

## CONTINGENCY PROCEDURES

### Scenario 1: Registration System Becomes Slow (> 5 sec)

**Action Plan:**
```
IMMEDIATE (< 1 minute):
1. Check browser console for errors
2. Refresh admin dashboard
3. Check Supabase connection in dashboard

5 MINUTES:
1. Switch 1 registration station to backup (manual paper form)
2. Contact engineering team
3. Take screenshot of Supabase dashboard

IF NOT RESOLVED (10 minutes):
1. Migrate all registrations to manual paper form
2. Staff transcribe entries to system after event
3. Deploy emergency fix if identified
4. Switch back to online when resolved
```

### Scenario 2: Authentication Fails (Staff Can't Login)

**Action Plan:**
```
IMMEDIATE:
1. Try incognito window (clear cache)
2. Check Supabase auth dashboard
3. Verify user exists in auth.users table

5 MINUTES:
1. Reset staff member's password
2. Create backup admin account if needed
3. Switch to manual backup registration

LONGER TERM:
1. Check if auth quota exceeded
2. Review Supabase logs for auth errors
3. Restart auth services if available
```

### Scenario 3: Database Unreachable

**Action Plan:**
```
IMMEDIATE:
1. Verify you have internet connection
2. Check Supabase dashboard (log in separately)
3. Check Firebase project health

SYSTEM FAILURE CONFIRMED:
1. STOP all online registrations
2. SWITCH to manual paper registration system
3. Have staff manually record:
   - Name
   - ID Number
   - Position
   - Time arrived
   - Signature (optional)

POST-EVENT:
1. When system recovered, transcribe manual records to DB
2. Resolve any duplicate issues
3. Verify quórum calculation matches manual count
```

### Scenario 4: Quórum Calculation Looks Wrong

**Action Plan:**
```
VERIFY MANUALLY:
1. Count total active members in room (or list)
2. Count present members (scanned/registered)
3. Calculate: 2/3 of total = expected threshold
4. Compare with system calculation

IF MISMATCH:
1. Take screenshot of both (system and manual count)
2. Note exact discrepancy (±N members)
3. Contact engineering team
4. Document for post-event investigation
5. If critical: use manual count for event proceedings

ROOT CAUSE ANALYSIS (POST-EVENT):
- Did a member get counted twice?
- Did a guest get included in member count?
- Did someone's status change during event?
```

### Scenario 5: System Crashes / Requires Restart

**Action Plan:**
```
IF BROWSER CRASHES:
1. Close browser completely
2. Clear browser cache
3. Reopen application URL
4. Verify all data still present
5. Continue registrations

IF FIREBASE/SUPABASE DOWN (> 15 min):
1. Declare "MANUAL REGISTRATION MODE"
2. All registrations on paper forms
3. Keep detailed log for transcription
4. Monitor recovery in background
5. Resume online registration when available

AFTER RECOVERY:
1. Reconcile paper and digital records
2. Add any missing entries from paper
3. Resolve duplicates
4. Verify quórum with manual count
```

---

## POST-EVENT PROCEDURES

### Immediately After Event (30 minutes)

```
TASK                                    OWNER
────────────────────────────────────────────────
1. Export attendance records            Tech Support
   - SELECT * FROM attendance_records;
   - Save to CSV/Excel
   
2. Verify quórum calculation            Event Manager
   - Manual count final attendees
   - Compare with system calculation
   - Document discrepancies
   
3. Check for duplicates                 Engineering
   - SELECT session_id, attendee_id, 
     COUNT(*) FROM attendance_records
     GROUP BY session_id, attendee_id
     HAVING COUNT(*) > 1;
   - Investigate and document
   
4. Backup entire database               DevOps
   - Create Supabase backup point
   - Export to CSV/JSON for archive
   
5. Review Firebase logs                 Engineering
   - Check error reporting
   - Review authentication logs
   - Verify no unexpected failures
```

### Within 24 Hours

```
TASK                                    OWNER
────────────────────────────────────────────────
1. Generate event report                Event Manager
   - Total registrations
   - Quórum status & timing
   - Any technical issues encountered
   - Staff feedback
   
2. Send thank you to staff              Event Manager
   - With list of issue reports
   - Appreciation for support
   
3. Debrief meeting                      All Leads
   - Review what went well
   - Discuss issues encountered
   - Action items for v2.1
   
4. Update project documentation         Engineering
   - Record actual metrics vs expected
   - Lessons learned
   - Improvements for next time
```

### Before Next Event (1 week)

```
TASK                                    OWNER
────────────────────────────────────────────────
1. Complete post-mortem analysis        Engineering
   
2. Fix any identified bugs              Engineering
   
3. Plan v2.1 voting reactivation        Product
   
4. Update runbook based on             Operations
   actual event experience
   
5. Archive all event data securely      DevOps
```

---

## CONTACT INFORMATION

During live event, have these channels open:

```
🚨 CRITICAL ISSUES (< 5 min response needed)
   - Discord: #asamblea-tech-support
   - Slack: @engineering-on-call
   - Phone: [PROVIDE NUMBER]

📊 MONITORING QUESTIONS (< 15 min response)
   - Email: tech-support@jcautomation.net
   - Discord: #asamblea-questions

📝 DOCUMENTATION
   - V2.0 CHANGES: /V2.0-CHANGES.md
   - This guide: /EVENT-DAY-TIMELINE.md
   - Security: /SECURITY-ARCHITECTURE-ANALYSIS.md
```

---

## Final Notes

- **This system was built to be reliable**, but backups exist for all critical flows
- **Staff are trained on manual procedures** — we can operate without tech if needed
- **Every step has been tested** — confidence is high but vigilance is required
- **Document everything** — all decisions, issues, and decisions help us improve

---

**Event Date:** August XX, 2026  
**Expected Attendance:** 150-200  
**System Status:** ✅ READY  
**Contingencies:** ✅ PREPARED  
**Support Team:** ✅ BRIEFED  

Let's make this event successful! 🎉
