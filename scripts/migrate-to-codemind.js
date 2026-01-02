#!/usr/bin/env node
/**
 * CodeMind Migration Script
 * 
 * Migrates existing Letta installations to CodeMind branding
 * - Renames configuration files
 * - Updates environment variables
 * - Preserves all data and settings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🧠 CODEMIND MIGRATION ASSISTANT                       ║
║                                                               ║
║              Migrating from Letta to CodeMind                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

console.log(chalk.white('\n🔄 Starting migration process...\n'));

const migrations = [
  {
    from: '.letta_agent_id',
    to: '.codemind_agent_id',
    description: 'Agent ID file'
  },
  {
    from: '.letta_agent_config.json',
    to: '.codemind_agent_config.json',
    description: 'Agent configuration'
  },
  {
    from: '.letta_history.json',
    to: '.codemind_history.json',
    description: 'Project history'
  }
];

let migratedCount = 0;
let skippedCount = 0;

// Migrate files
for (const migration of migrations) {
  const fromPath = path.join(ROOT, migration.from);
  const toPath = path.join(ROOT, migration.to);
  
  if (fs.existsSync(fromPath)) {
    if (fs.existsSync(toPath)) {
      console.log(chalk.yellow(`⚠️  ${migration.description}: Target already exists, skipping`));
      skippedCount++;
    } else {
      try {
        fs.renameSync(fromPath, toPath);
        console.log(chalk.green(`✅ ${migration.description}: Migrated successfully`));
        migratedCount++;
      } catch (error) {
        console.log(chalk.red(`❌ ${migration.description}: Failed to migrate - ${error.message}`));
      }
    }
  } else {
    console.log(chalk.gray(`ℹ️  ${migration.description}: Not found, skipping`));
    skippedCount++;
  }
}

// Migrate .env file
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    let updated = false;
    
    // Replace environment variable names
    const replacements = [
      ['LETTA_API_KEY', 'CODEMIND_API_KEY'],
      ['LETTA_PROJECT_ID', 'CODEMIND_PROJECT_ID'],
      ['LETTA_THEME', 'CODEMIND_THEME'],
      ['LETTA_IDE', 'CODEMIND_IDE']
    ];
    
    for (const [oldVar, newVar] of replacements) {
      const regex = new RegExp(`^${oldVar}=`, 'gm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${newVar}=`);
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(chalk.green('✅ Environment variables: Updated successfully'));
      migratedCount++;
    } else {
      console.log(chalk.gray('ℹ️  Environment variables: No Letta variables found'));
      skippedCount++;
    }
  } catch (error) {
    console.log(chalk.red(`❌ Environment variables: Failed to update - ${error.message}`));
  }
} else {
  console.log(chalk.gray('ℹ️  .env file: Not found, skipping'));
  skippedCount++;
}

// Migration summary
console.log(chalk.cyan('\n📊 Migration Summary:'));
console.log(`   ${chalk.green('✅ Migrated:')} ${migratedCount} items`);
console.log(`   ${chalk.yellow('⚠️  Skipped:')} ${skippedCount} items`);

if (migratedCount > 0) {
  console.log(chalk.green('\n🎉 Migration completed successfully!'));
  console.log(chalk.white('\n📝 Next steps:'));
  console.log('   1. Update your shell aliases or scripts to use "codemind" instead of "letta"');
  console.log('   2. If you have any custom scripts, update environment variable names');
  console.log('   3. Run "npm start" to verify everything works correctly');
} else {
  console.log(chalk.yellow('\n⚠️  No migration needed - no Letta files found'));
}

console.log(chalk.cyan('\n👋 Welcome to CodeMind! 🧠\n'));