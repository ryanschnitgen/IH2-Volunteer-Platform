# Event Reminder Setup

## Overview
The system automatically sends reminder emails 24 hours before events to all registered volunteers.

## How It Works
- Runs daily at 9:00 AM (configurable)
- Finds all events happening tomorrow
- Sends personalized reminder emails to all registered volunteers
- Includes event details, time, location, and a link to view/cancel

## Setup Instructions

### 1. Environment Variables
Add to your `.env.local` file:

```bash
# Required for sending emails (already configured if you're using the send-email API)
RESEND_API_KEY=your_resend_api_key

# Optional: Add security to the cron endpoint
CRON_SECRET=your_random_secret_string

# Required: Your site URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 2. Vercel Deployment (Automatic)
The `vercel.json` file is already configured to run the cron job daily at 9:00 AM UTC.

When you deploy to Vercel, the cron job will automatically be set up.

To change the schedule, edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/event-reminders",
      "schedule": "0 9 * * *"  // Daily at 9 AM UTC
    }
  ]
}
```

Cron schedule format (minute hour day month weekday):
- `0 9 * * *` - 9 AM every day
- `0 */6 * * *` - Every 6 hours
- `0 8,20 * * *` - 8 AM and 8 PM every day

### 3. Manual Testing
You can manually trigger the reminder system by visiting:

```
GET https://your-domain.com/api/cron/event-reminders
```

If you set `CRON_SECRET`, include it in the header:
```bash
curl -H "Authorization: Bearer your_cron_secret" \
  https://your-domain.com/api/cron/event-reminders
```

### 4. Local Development Testing
To test locally:

```bash
# Start your dev server
npm run dev

# In another terminal, trigger the cron:
curl http://localhost:3000/api/cron/event-reminders
```

## Email Template
The reminder email includes:
- Event title and description
- Date and time
- Location with map link
- Button to view event details
- Link to cancel registration

## Monitoring
Check your Vercel dashboard under "Cron Jobs" to see:
- Execution history
- Success/failure status
- Logs for each run

## Troubleshooting

**No emails being sent:**
1. Check that events exist for tomorrow
2. Verify volunteers are registered for those events
3. Check that `RESEND_API_KEY` is set correctly
4. Review Vercel cron logs for errors

**Wrong timing:**
- Remember the cron runs in UTC time
- Convert your desired local time to UTC
- Example: 9 AM EST = 2 PM UTC = `0 14 * * *`

**Emails going to spam:**
- Add your domain to Resend's verified domains
- Set up SPF and DKIM records
- Test with email testing tools
