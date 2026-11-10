# MSKSphere - Setup Guide

## Step 1: Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Click "New Project"
4. Fill in the project details:
   - **Name**: msksphere (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose a region close to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. Once your project is ready, go to **Project Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like: https://xxxxxxxxxxxxx.supabase.co)
   - **anon public** key (the long JWT token)

## Step 3: Update the Config File

1. Open `js/config.js` in your code editor
2. Replace `YOUR_SUPABASE_URL_HERE` with your Project URL
3. Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your anon public key

Example:
```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 4: Run the SQL Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `migration_templates.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

The migration will:
- Create `templates` table
- Create `template_tasks` table
- Add template-related columns to the `tasks` table
- Set up Row Level Security (RLS) policies
- Create indexes for performance
- Add triggers for automatic timestamp updates

## Step 5: Verify the Migration

After running the migration, verify it worked:

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `profiles` (existing)
   - `tasks` (existing)
   - `task_completions` (existing)
   - `templates` (new)
   - `template_tasks` (new)

3. Click on the `tasks` table and verify these new columns exist:
   - `task_source`
   - `source_template_id`
   - `source_template_task_id`
   - `template_icon_snapshot`
   - `scheduled_start_time`
   - `scheduled_end_time`

## Step 6: Test the Application

1. Open the application in your browser (http://localhost:8080)
2. You should see the login screen
3. Click "Sign Up" to create a new account
4. After logging in, navigate to the **Templates** page
5. Create your first template:
   - Click "+ Create Template"
   - Enter a name (e.g., "College Timetable")
   - Select an icon
   - Click "Create Template"
6. Add tasks to your template:
   - Click "+ Add Task"
   - Enter task name, start time, end time
   - Select days
   - Click "Save Task"
7. Apply the template:
   - Click "Apply Template"
   - Select a date range
   - Review the preview
   - Click "Apply Template"
8. Check that the generated tasks appear in:
   - Dashboard (Today's Tasks)
   - Tasks page (with date filter)
   - Calendar (on the selected dates)

## Troubleshooting

### "Supabase configuration not loaded" error
- Make sure you've updated `js/config.js` with your actual credentials
- Check that the URL and key are correct (no extra spaces or quotes)

### Migration fails
- Make sure you copied the entire `migration_templates.sql` file
- Check for any syntax errors in the SQL Editor
- Ensure your Supabase project is fully provisioned

### Tasks not appearing after applying template
- Check the browser console for errors
- Verify the migration ran successfully
- Make sure you selected dates that match the task's selected days

### Cannot create/edit templates
- Check that RLS policies were created successfully
- Verify you're logged in with the correct account
- Check the browser console for permission errors

## File Structure

```
TT2/
├── index.html              # Main HTML file
├── script.js               # Application logic
├── styles.css              # Styling
├── js/
│   └── config.js           # Supabase configuration (you'll update this)
├── migration_templates.sql # Database migration (run this in Supabase)
└── SETUP_GUIDE.md          # This file
```

## Security Notes

- Never commit your actual Supabase credentials to version control
- The `anon` key is safe to use in frontend code (it has restricted permissions)
- Row Level Security (RLS) ensures users can only access their own data
- Never use the `service_role` key in frontend code

## What's New in This Version

1. **Templates Page**: Create and manage reusable timetable templates
2. **Template Icons**: Choose from 12 different icons for your templates
3. **Timetable Tasks**: Add multiple tasks with specific times and days to each template
4. **Date-Based Application**: Apply templates to specific date ranges
5. **Duplicate Prevention**: Automatically prevents creating duplicate tasks
6. **Date Filtering**: Tasks page now allows filtering by date
7. **Template Icons in Tasks**: Generated tasks show their template icon and scheduled times
8. **Icon Persistence**: Generated tasks retain their original icon even if the template changes

## Preserved Features

All existing features from the original MSKSphere are still available:
- User authentication (login, signup, password reset)
- Dashboard with statistics
- Tasks management with priorities and recurrence
- Calendar view with completion tracking
- Profile settings

The design maintains the green WhatsApp-inspired color palette and user experience.
