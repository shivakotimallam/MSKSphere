# MSKSphere - Production Deployment Guide

## Overview
MSKSphere is a personal productivity and finance application with the tagline "Your tasks. Your money. Your world."

## Tech Stack
- **Frontend**: Plain HTML, CSS, JavaScript (no framework)
- **Backend**: Supabase (PostgreSQL database + Authentication)
- **Deployment**: Static hosting (Vercel, Netlify, or similar)

## Prerequisites

### Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Run the SQL migrations in order in the Supabase SQL Editor:
   - `supabase/database.sql` (base schema)
   - `migration_daily_notes.sql`
   - `migration_expense_tracker.sql`
   - `migration_lent_money.sql`
   - `migration_templates.sql`
   - `create_goals_table.sql` (if not included in templates migration)

### Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Copy `js/config.example.js` to `js/config.js`
4. Fill in the same credentials in `js/config.js`

### Critical Security Note
- **The Supabase anon key is safe to expose in frontend code** - it's designed for public use
- **Never expose the service_role key** - it has full database access
- **Ensure RLS policies are enabled** on all tables
- **The .env file is in .gitignore** - never commit it

## Local Development
```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (if you add package.json)
npx serve

# Then open http://localhost:8080
```

## Deployment

### Option 1: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Option 2: Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Add environment variables in Netlify dashboard

### Option 3: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to `/ (root)` and branch to `main`
4. Note: You'll need to update the config.js file with your credentials before pushing

## Post-Deployment Checklist
- [ ] Test signup/login flow
- [ ] Test task creation and completion
- [ ] Test calendar navigation
- [ ] Test daily notes
- [ ] Test money tracking (accounts, income, expenses, transfers)
- [ ] Test pending money feature
- [ ] Test analytics page
- [ ] Test on mobile (small phone)
- [ ] Test on mobile (large phone)
- [ ] Test on tablet
- [ ] Test on laptop/desktop
- [ ] Verify all modals work
- [ ] Verify all forms validate correctly
- [ ] Check browser console for errors
- [ ] Test network requests in DevTools

## Database Migrations
All SQL files in the root directory must be run in Supabase SQL Editor in order:
1. `supabase/database.sql` - Base schema (tasks, profiles, etc.)
2. `migration_daily_notes.sql` - Daily notes feature
3. `migration_expense_tracker.sql` - Money tracking feature
4. `migration_lent_money.sql` - Pending money feature
5. `migration_templates.sql` - Templates feature
6. `create_goals_table.sql` - Long-term goals (if not in templates)

## Security Notes
- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- No service_role keys are exposed
- Input validation is implemented in JavaScript
- XSS protection via escapeHtml() function

## Performance Notes
- Supabase CDN is used for JavaScript library
- CSS and JS are minified (can be further optimized)
- Cache-busting query strings are used (styles.css?v=44, script.js?v=107)
- Database indexes are in place for common queries

## Known Limitations
- No server-side rendering (SPA)
- No automated tests (manual testing required)
- No TypeScript (plain JavaScript)
- No build process (static files served directly)
- Custom categories stored in localStorage (not synced across devices)

## Support
For issues or questions, check the SETUP_GUIDE.md file.
