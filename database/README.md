# Database Scripts

SQL migration and setup scripts for Supabase.

## Schema Setup
- `supabase_schema_updates.sql` - Main schema updates
- `supabase_subscription_schema.sql` - Subscription tables
- `supabase_notifications_setup.sql` - Notification system
- `supabase_referral_setup.sql` - Referral system
- `supabase_profile_pictures_storage.sql` - Profile picture storage
- `supabase_profiles_public_read.sql` - Profile permissions
- `supabase_favorite_companies.sql` - Favorites feature
- `supabase_job_requirements_update.sql` - Job requirements

## Fixes & Patches
- `fix_companies_rls.sql` - Company RLS policies
- `fix_profiles_rls.sql` - Profile RLS policies
- `fix_storage_policies.sql` - Storage policies
- `fix_notification_trigger.sql` - Notification triggers
- `fix_live_application_queue.sql` - Application queue
- `fix_live_application_queue_schema.sql` - Queue schema
- `fix_users_table_error.sql` - User table fixes

## Testing & Diagnostics
- `test_notifications.sql` - Test notifications
- `test_companies.sql` - Test company data
- `test_referral_db.sql` - Test referral system
- `diagnose_total_apps_error.sql` - Diagnostic queries

## Manual Setup
- `setup_referral_code_manual.sql` - Manual referral setup
