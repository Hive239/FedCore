# Demo Mode Instructions

The app is now running in demo mode with authentication disabled. You can explore all features without logging in.

## To start the demo:

1. Make sure you're using the demo environment:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000 in your browser

3. You'll be able to navigate through:
   - **Dashboard** - Overview of all projects
   - **Projects** - View contractor projects (kitchen renovations, HVAC upgrades, etc.)
   - **Tasks** - Kanban board for task management
   - **Vendors** - Subcontractor directory
   - **Documents** - File management
   - **Calendar** - Schedule view
   - **Messages** - Communication hub
   - **Settings** - Configuration options

## Demo Data Includes:
- 5 sample contractor projects (kitchen renovation, HVAC upgrade, retail buildout, etc.)
- Various project statuses (new, on-track, delayed, on-hold, completed)
- Sample clients and associations

## To return to normal mode:
```bash
cp .env.local.backup .env.local
```

Then restart the development server.