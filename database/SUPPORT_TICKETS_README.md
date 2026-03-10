# Support Tickets Feature Setup

## Overview
The support tickets feature allows users to report problems, bugs, and safety/security issues through the Help & Support page. All submissions are stored in Supabase.

## Database Setup

### 1. Run the SQL Migration
Execute the SQL file in your Supabase SQL Editor:
```bash
database/supabase_support_tickets.sql
```

This will create:
- `support_tickets` table with proper schema
- Indexes for optimized queries
- Row Level Security (RLS) policies

### 2. Table Schema
```sql
support_tickets (
  id UUID PRIMARY KEY,
  user_id UUID (references profiles),
  type TEXT ('problem', 'bug', 'safety'),
  category TEXT (selected issue category),
  description TEXT (user's detailed description),
  status TEXT ('open', 'in_progress', 'resolved', 'closed'),
  attachments TEXT[] (array of attachment references),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Features

### Three Ticket Types
1. **Report a Problem** - General app issues
2. **Report a Bug** - Technical bugs and errors
3. **Safety & Security** - Security concerns and suspicious activity

### Form Fields
- Issue Category (dropdown with type-specific options)
- Description (2000 character limit)
- Attachments (optional, placeholder for future implementation)

### Functionality
- ✅ Form validation
- ✅ Supabase integration
- ✅ User authentication check
- ✅ Loading states
- ✅ Success/error feedback
- ✅ Haptic feedback (mobile)

## Usage

Users can access the feature from:
1. Profile → Settings → Help & Support
2. Select one of: Report a Problem, Report a Bug, or Safety & Security
3. Fill out the form and submit

## Admin Access

To view submitted tickets, query the Supabase database:
```sql
SELECT * FROM support_tickets 
ORDER BY created_at DESC;
```

You can also create an admin dashboard to manage tickets by querying this table.
