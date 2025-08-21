#!/usr/bin/env node

/**
 * Supabase Progress Migration Checker
 * 
 * This script connects to your Supabase project to:
 * 1. Check the current progress_percentage values in reading_progress table
 * 2. Identify any values that need migration from 0-100 to 0-1 scale
 * 3. Optionally perform the migration
 * 
 * Usage:
 * node check-progress-migration.js [--migrate]
 */

import { createClient } from '@supabase/supabase-js';

// Your Supabase configuration (loaded from environment variables)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  console.error('Please set these variables before running the script.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function validateConnection() {
  try {
    const { error } = await supabase.from('reading_progress').select('id').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connection successful\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return false;
  }
}

async function checkProgressValues() {
  console.log('🔍 Checking reading_progress table for migration needs...\n');
  
  try {
    // Query all reading progress records
    const { data: progressRecords, error } = await supabase
      .from('reading_progress')
      .select('id, user_id, book_id, progress_percentage, last_read_at')
      .order('last_read_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying reading_progress:', error.message);
      return;
    }

    if (!progressRecords || progressRecords.length === 0) {
      console.log('✅ No reading progress records found. Database is clean.');
      return;
    }

    console.log(`📊 Found ${progressRecords.length} reading progress records\n`);

    // Analyze the progress values
    const valueAnalysis = {
      total: progressRecords.length,
      validZeroToOne: 0,      // Values between 0-1 (correct)
      needsMigration: 0,      // Values between 1-100 (need conversion)
      outOfRange: 0,          // Values > 100 (data error)
      recordsToMigrate: []
    };

    progressRecords.forEach(record => {
      const progress = record.progress_percentage;
      
      if (progress >= 0 && progress <= 1) {
        valueAnalysis.validZeroToOne++;
      } else if (progress > 1 && progress <= 100) {
        valueAnalysis.needsMigration++;
        valueAnalysis.recordsToMigrate.push({
          id: record.id,
          user_id: record.user_id,
          book_id: record.book_id,
          currentValue: progress,
          newValue: progress / 100,
          lastRead: record.last_read_at
        });
      } else if (progress > 100) {
        valueAnalysis.outOfRange++;
        console.warn(`⚠️  Out of range value found: ${progress}% (record ID: ${record.id})`);
      }
    });

    // Display analysis results
    console.log('📈 Progress Value Analysis:');
    console.log(`   ✅ Valid (0-1 scale): ${valueAnalysis.validZeroToOne} records`);
    console.log(`   🔄 Need migration (1-100 scale): ${valueAnalysis.needsMigration} records`);
    console.log(`   ❌ Out of range (>100): ${valueAnalysis.outOfRange} records`);
    console.log('');

    if (valueAnalysis.needsMigration > 0) {
      console.log('🔄 Records that need migration from 0-100 to 0-1 scale:');
      valueAnalysis.recordsToMigrate.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.currentValue}% → ${(record.newValue * 100).toFixed(1)}% (${record.newValue.toFixed(4)})`);
      });
      console.log('');
      
      return valueAnalysis.recordsToMigrate;
    } else {
      console.log('✅ All progress values are already in the correct 0-1 scale. No migration needed.');
      return [];
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    throw error;
  }
}

async function migrateProgressValues(recordsToMigrate) {
  console.log(`🚀 Starting migration of ${recordsToMigrate.length} records...\n`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const record of recordsToMigrate) {
    try {
      const { error } = await supabase
        .from('reading_progress')
        .update({ progress_percentage: record.newValue })
        .eq('id', record.id);

      if (error) {
        console.error(`❌ Failed to migrate record ${record.id}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Migrated: ${record.currentValue}% → ${(record.newValue * 100).toFixed(1)}% (${record.newValue.toFixed(4)})`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Unexpected error migrating record ${record.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Results:`);
  console.log(`   ✅ Successfully migrated: ${successCount} records`);
  console.log(`   ❌ Failed migrations: ${errorCount} records`);
  
  if (successCount > 0) {
    console.log(`\n🎉 Migration completed! All progress values are now in 0-1 scale.`);
  }
}

async function main() {
  const shouldMigrate = process.argv.includes('--migrate');
  
  console.log('🚀 Arcadia Reader - Progress Migration Checker');
  console.log(`📍 Project: ${SUPABASE_URL}`);
  console.log(`🔧 Mode: ${shouldMigrate ? 'MIGRATION' : 'CHECK ONLY'}\n`);

  try {
    // Validate database connection first
    const isConnected = await validateConnection();
    if (!isConnected) {
      console.error('💥 Cannot proceed without a valid database connection.');
      process.exit(1);
    }
    
    const recordsToMigrate = await checkProgressValues();
    
    if (recordsToMigrate.length > 0 && shouldMigrate) {
      console.log('⚠️  IMPORTANT: This will modify your database. Make sure you have a backup!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      // Wait 5 seconds before proceeding
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await migrateProgressValues(recordsToMigrate);
    } else if (recordsToMigrate.length > 0) {
      console.log('💡 To perform the migration, run: node check-progress-migration.js --migrate');
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();