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

// Skip .env migration - CodeMind uses Letta API backend
console.log(chalk.gray('ℹ️  Environment variables: Keeping LETTA_* variables (CodeMind uses Letta AI backend)'));
skippedCount++;

// Migration summary
console.log(chalk.cyan('\n📊 Migration Summary:'));
console.log(`   ${chalk.green('✅ Migrated:')} ${migratedCount} items`);
console.log(`   ${chalk.yellow('⚠️  Skipped:')} ${skippedCount} items`);

if (migratedCount > 0) {
  console.log(chalk.green('\n🎉 Migration completed successfully!'));
  console.log(chalk.white('\n📝 Next steps:'));
  console.log('   1. Update your shell aliases or scripts to use "codemind" instead of "letta"');
  console.log('   2. Environment variables remain as LETTA_* (CodeMind uses Letta AI backend)');
  console.log('   3. Run "npm start" to verify everything works correctly');
} else {
  console.log(chalk.yellow('\n⚠️  No migration needed - no Letta files found'));
}

console.log(chalk.cyan('\n👋 Welcome to CodeMind! 🧠\n'));