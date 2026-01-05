# Pre-Launch Testing Checklist
## IH2 Volunteer Portal - End-to-End Testing

**Test URL:** https://ih-2-volunteer-platform.vercel.app
**Date:** _____________
**Tester:** _____________

---

## ✅ Test 1: New Volunteer Registration Flow

### 1.1 Sign Up (Email/Password)
- [ ] Go to `/signup`
- [ ] Fill in all required fields:
  - Full Name
  - Email (use a NEW test email)
  - Phone, Address, City, State, Zip
  - Password (min 8 characters)
  - Confirm password
- [ ] Submit form
- [ ] **Expected:** Redirected to `/waiver` page
- [ ] **Result:** _______________

### 1.2 Waiver Acceptance
- [ ] Read waiver content
- [ ] Check "I Agree" checkbox
- [ ] Click "I Agree - Complete Registration"
- [ ] **Expected:** Redirected to home page
- [ ] **Expected:** Navigation shows username, NO red waiver warning
- [ ] **Result:** _______________

### 1.3 Sign Up with Google
- [ ] Log out
- [ ] Go to `/signup`
- [ ] Click "Sign up with Google"
- [ ] **Expected:** Redirected to `/waiver` page
- [ ] Complete waiver
- [ ] **Expected:** Successfully logged in
- [ ] **Result:** _______________

---

## ✅ Test 2: Waiver Enforcement (CRITICAL)

### 2.1 Registration Without Waiver
- [ ] Create new account (don't sign waiver, navigate away from waiver page)
- [ ] Go to `/opportunities`
- [ ] Try to register for an event
- [ ] **Expected:** Modal appears: "Waiver Required"
- [ ] **Expected:** Redirected to `/waiver` when confirmed
- [ ] **Expected:** Cannot register until waiver signed
- [ ] **Result:** _______________

### 2.2 Waiver Status Indicator
- [ ] Log in with account that hasn't signed waiver
- [ ] Check navigation bar
- [ ] **Expected:** Shows "⚠️ Sign Waiver Required" in red
- [ ] Click the warning
- [ ] **Expected:** Goes to `/waiver` page
- [ ] **Result:** _______________

### 2.3 After Signing Waiver
- [ ] Sign waiver
- [ ] **Expected:** Red warning disappears from navigation
- [ ] Go to `/opportunities`
- [ ] **Expected:** Can now register for events
- [ ] **Result:** _______________

---

## ✅ Test 3: Authentication Flows

### 3.1 Login
- [ ] Log out
- [ ] Go to `/login`
- [ ] Enter correct email/password
- [ ] **Expected:** Successfully logged in
- [ ] **Expected:** Redirected to home page
- [ ] **Result:** _______________

### 3.2 Login with Wrong Password
- [ ] Go to `/login`
- [ ] Enter wrong password
- [ ] **Expected:** Error message displayed
- [ ] **Expected:** Not logged in
- [ ] **Result:** _______________

### 3.3 Password Reset
- [ ] Go to `/reset-password`
- [ ] Enter your email address
- [ ] Click "Send reset link"
- [ ] **Expected:** Success message appears
- [ ] Check email (including spam folder)
- [ ] **Expected:** Email arrives within 5 minutes
- [ ] Click reset link in email
- [ ] **Expected:** Can set new password
- [ ] **Result:** _______________

### 3.4 Logout
- [ ] Click "Sign Out" button
- [ ] **Expected:** Logged out
- [ ] **Expected:** Redirected to home page
- [ ] **Result:** _______________

---

## ✅ Test 4: Event Registration & Management

### 4.1 Browse Opportunities
- [ ] Go to `/opportunities`
- [ ] **Expected:** See list of active events
- [ ] Switch to calendar view
- [ ] **Expected:** Events shown on calendar
- [ ] **Result:** _______________

### 4.2 Filter Opportunities
- [ ] Use category filter
- [ ] Use date range filters
- [ ] Check "Only show available spots"
- [ ] **Expected:** Events filter correctly
- [ ] Click "Clear All Filters"
- [ ] **Expected:** All events shown again
- [ ] **Result:** _______________

### 4.3 Register for Event (Individual)
- [ ] Find event with available spots
- [ ] Click "Sign Up"
- [ ] Confirm registration
- [ ] **Expected:** Success message
- [ ] **Expected:** Event shows "Edit Registration" and "Cancel Registration" buttons
- [ ] **Result:** _______________

### 4.4 Register for Event (Group)
- [ ] Find different event with 3+ spots available
- [ ] Click "Sign Up"
- [ ] Check "I'm registering for multiple people"
- [ ] Enter 2 additional attendees
- [ ] Enter names for each person
- [ ] Confirm registration
- [ ] **Expected:** Registration successful for 3 people total
- [ ] **Result:** _______________

### 4.5 Edit Registration
- [ ] Find event you're registered for
- [ ] Click "Edit Registration"
- [ ] Change number of attendees
- [ ] **Expected:** Can add/remove guests
- [ ] Save changes
- [ ] **Expected:** Registration updated
- [ ] **Result:** _______________

### 4.6 Cancel Registration
- [ ] Click "Cancel Registration"
- [ ] Confirm cancellation
- [ ] **Expected:** Registration cancelled
- [ ] **Expected:** Event shows "Sign Up" button again
- [ ] **Expected:** Spot becomes available again
- [ ] **Result:** _______________

### 4.7 Event Full Scenario
- [ ] Find event with 0 spots remaining
- [ ] **Expected:** "Event Full" button (disabled)
- [ ] **Expected:** Cannot register
- [ ] **Result:** _______________

### 4.8 Share Event
- [ ] Click "Share" button on an event
- [ ] **Expected:** Event link copied to clipboard
- [ ] **Expected:** Success message appears
- [ ] **Result:** _______________

---

## ✅ Test 5: My Schedule

### 5.1 View Upcoming Events
- [ ] Go to `/my-schedule`
- [ ] **Expected:** See all events you're registered for
- [ ] **Expected:** Shows date, time, location
- [ ] **Result:** _______________

### 5.2 Check-In to Event
- [ ] Find event happening today or in past
- [ ] Click "Check In"
- [ ] **Expected:** Check-in successful
- [ ] **Expected:** Status changes to "Checked In"
- [ ] **Result:** _______________

---

## ✅ Test 6: Volunteer Hours Tracking

### 6.1 View Hours Dashboard
- [ ] Go to `/volunteer-hours`
- [ ] **Expected:** See lifetime hours total
- [ ] **Expected:** See monthly breakdown chart
- [ ] **Expected:** See hours by category
- [ ] **Result:** _______________

### 6.2 Hours History
- [ ] Scroll to hours log table
- [ ] **Expected:** See all logged hours
- [ ] **Expected:** Shows date, event, hours, category
- [ ] **Result:** _______________

### 6.3 Export Hours
- [ ] Click "Export to CSV" button
- [ ] **Expected:** CSV file downloads
- [ ] Open CSV
- [ ] **Expected:** Contains all hours data
- [ ] **Result:** _______________

---

## ✅ Test 7: Profile Management

### 7.1 View Profile
- [ ] Go to `/profile`
- [ ] **Expected:** See all profile information
- [ ] **Expected:** See volunteer stats
- [ ] **Result:** _______________

### 7.2 Update Profile
- [ ] Click "Edit Profile"
- [ ] Update phone number
- [ ] Update address
- [ ] Save changes
- [ ] **Expected:** Profile updated successfully
- [ ] **Result:** _______________

---

## ✅ Test 8: Admin Functions (Admin Account Only)

### 8.1 Access Admin Panel
- [ ] Log in as admin (email in NEXT_PUBLIC_ADMIN_EMAILS)
- [ ] **Expected:** "Admin" link appears in navigation
- [ ] Click "Admin"
- [ ] **Expected:** Admin dashboard loads
- [ ] **Result:** _______________

### 8.2 Create Event
- [ ] Go to `/admin/events`
- [ ] Click "Create New Event"
- [ ] Fill in all fields:
  - Title, Organization, Location
  - Date, Start/End Time
  - Description
  - Category, Event Type
  - Spots Available
- [ ] Click "Create Event"
- [ ] **Expected:** Event created successfully
- [ ] **Expected:** Event appears in opportunities list
- [ ] **Result:** _______________

### 8.3 Edit Event
- [ ] Find the event you created
- [ ] Click "Edit"
- [ ] Change title and date
- [ ] Save changes
- [ ] **Expected:** Event updated
- [ ] **Expected:** Changes reflected immediately
- [ ] **Result:** _______________

### 8.4 View Event Registrations
- [ ] Click "View Registrations" on an event
- [ ] **Expected:** See all registered volunteers
- [ ] **Expected:** Shows names, emails, check-in status
- [ ] **Result:** _______________

### 8.5 Manage Volunteers
- [ ] Go to `/admin/volunteers`
- [ ] **Expected:** See all volunteer profiles
- [ ] Search for a volunteer
- [ ] **Expected:** Search works correctly
- [ ] **Result:** _______________

### 8.6 Send Email to Event Participants
- [ ] Go to `/admin/email`
- [ ] Select an event
- [ ] **Expected:** Shows registered participants
- [ ] Compose test email
- [ ] Send to yourself only (for testing)
- [ ] **Expected:** Email received
- [ ] **Result:** _______________

### 8.7 User Management
- [ ] Go to `/admin`
- [ ] Click "User Management"
- [ ] **Expected:** See all users
- [ ] Search for a user
- [ ] **Expected:** Search works
- [ ] **Result:** _______________

---

## ✅ Test 9: Legal & Compliance Pages

### 9.1 Terms of Service
- [ ] Go to `/terms-of-service`
- [ ] **Expected:** Full terms displayed
- [ ] **Expected:** All 15 sections present
- [ ] **Result:** _______________

### 9.2 Privacy Policy
- [ ] Go to `/privacy-policy`
- [ ] **Expected:** Privacy policy displayed
- [ ] **Result:** _______________

### 9.3 Cookie Consent
- [ ] Clear cookies and reload site
- [ ] **Expected:** Cookie consent banner appears
- [ ] Click "Accept"
- [ ] **Expected:** Banner disappears
- [ ] **Expected:** Choice saved (doesn't appear again)
- [ ] **Result:** _______________

### 9.4 Contact Form
- [ ] Go to `/contact`
- [ ] Fill in name, email, message
- [ ] Submit form
- [ ] **Expected:** Success message
- [ ] Check info@inspiredheartsandhands.com
- [ ] **Expected:** Email received
- [ ] **Result:** _______________

---

## ✅ Test 10: Navigation & UI

### 10.1 All Navigation Links
- [ ] Click every link in navigation bar
- [ ] **Expected:** All pages load correctly
- [ ] **Expected:** No broken links
- [ ] **Result:** _______________

### 10.2 Footer Links
- [ ] Scroll to footer
- [ ] Click all portal links (Opportunities, My Hours, Contact)
- [ ] Click all main website links (external)
- [ ] Click legal links (Privacy, Terms)
- [ ] **Expected:** All links work
- [ ] **Result:** _______________

### 10.3 Mobile Navigation
- [ ] Resize browser to mobile width
- [ ] Click hamburger menu
- [ ] **Expected:** Menu opens
- [ ] Click all menu items
- [ ] **Expected:** All work correctly
- [ ] **Result:** _______________

### 10.4 404 Page
- [ ] Go to `/nonexistent-page`
- [ ] **Expected:** Custom 404 page appears
- [ ] Click "Return Home"
- [ ] **Expected:** Returns to home page
- [ ] **Result:** _______________

### 10.5 Error Page
- [ ] Trigger an error (try invalid URL parameters)
- [ ] **Expected:** Custom error page appears
- [ ] Click "Try Again" or "Return Home"
- [ ] **Expected:** Works correctly
- [ ] **Result:** _______________

---

## ✅ Test 11: Mobile Responsiveness

### 11.1 Phone View (375px)
- [ ] Resize browser to 375px width
- [ ] Navigate all pages
- [ ] **Expected:** Everything readable and usable
- [ ] **Expected:** No horizontal scroll
- [ ] **Expected:** Buttons and forms work
- [ ] **Result:** _______________

### 11.2 Tablet View (768px)
- [ ] Resize to 768px width
- [ ] Navigate all pages
- [ ] **Expected:** Layout adjusts properly
- [ ] **Expected:** Everything functional
- [ ] **Result:** _______________

### 11.3 Desktop View (1920px)
- [ ] Full screen desktop
- [ ] **Expected:** Proper use of space
- [ ] **Expected:** No elements too wide/narrow
- [ ] **Result:** _______________

---

## ✅ Test 12: Performance & Load Times

### 12.1 Page Load Speed
- [ ] Clear cache
- [ ] Load home page
- [ ] **Expected:** Loads in under 3 seconds
- [ ] **Result:** _______________

### 12.2 Image Loading
- [ ] Check all pages with images
- [ ] **Expected:** Images load properly
- [ ] **Expected:** No broken image icons
- [ ] **Result:** _______________

---

## ✅ Test 13: Email Deliverability

### 13.1 Password Reset Email
- [ ] Request password reset
- [ ] **Expected:** Email arrives in inbox
- [ ] **Expected:** Not in spam
- [ ] **Result:** _______________

### 13.2 Event Reminder Email (Admin)
- [ ] Admin: Send event reminder
- [ ] **Expected:** Participants receive email
- [ ] **Expected:** Email formatted correctly
- [ ] **Result:** _______________

### 13.3 Contact Form Email
- [ ] Submit contact form
- [ ] **Expected:** Email arrives at info@inspiredheartsandhands.com
- [ ] **Expected:** Contains all form data
- [ ] **Result:** _______________

---

## ✅ Test 14: Security Checks

### 14.1 Waiver Enforcement (API Level)
- [ ] Try to access `/api/events/register` directly (bypass UI)
- [ ] Without signed waiver
- [ ] **Expected:** 403 error returned
- [ ] **Expected:** Registration blocked
- [ ] **Result:** _______________

### 14.2 Admin Access Control
- [ ] Log in as non-admin user
- [ ] Try to access `/admin`
- [ ] **Expected:** Access denied or redirected
- [ ] **Result:** _______________

### 14.3 Protected Routes
- [ ] Log out completely
- [ ] Try to access `/opportunities`, `/profile`, `/my-schedule`
- [ ] **Expected:** Redirected to `/login`
- [ ] **Result:** _______________

---

## 🎯 Critical Issues Found

### High Priority (Must Fix Before Launch)
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Medium Priority (Should Fix Soon)
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Low Priority (Nice to Have)
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## ✅ Final Sign-Off

- [ ] All critical tests passed
- [ ] All security features working
- [ ] Waiver enforcement confirmed
- [ ] Email delivery verified
- [ ] Mobile responsiveness checked
- [ ] Admin functions working
- [ ] No broken links
- [ ] Legal pages accessible

**Site Ready for Launch:** YES / NO
**Tested By:** _______________
**Date:** _______________
**Notes:** _______________________________________________
