# Arcadia Reader Tools

This directory contains development and maintenance tools for the Arcadia Reader project.

## Directory Structure

```
tools/
├── migrations/          # Database migration scripts
│   ├── check-progress-migration.js    # Progress scale migration checker
│   └── migration-progress-scale.sql   # SQL migration for progress scale
└── README.md           # This file
```

## Migrations

### Progress Scale Migration

The progress scale migration tools help transition from 0-100 progress values to 0-1 scale:

#### Usage

```bash
# From project root:
npm run check-progress    # Check for values needing migration
npm run migrate-progress  # Perform the migration
```

#### Environment Variables

Set these environment variables for custom Supabase connections:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

If not set, the script will fall back to the default project credentials.

#### Features

- **Connection validation**: Ensures database connectivity before proceeding
- **Data analysis**: Shows distribution of progress values
- **Safe migration**: Includes warnings and delays before making changes
- **Progress tracking**: Reports success/failure for each migrated record

### SQL Migration

The `migration-progress-scale.sql` file can be run directly in the Supabase SQL Editor for manual migration.

## Security Notes

- All scripts use environment variables for credentials
- Fallback credentials are provided for convenience but should be replaced in production
- Migration scripts include safety warnings and confirmation delays