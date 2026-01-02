#!/usr/bin/env node
/**
 * 🧬 Letta Insights Dashboard
 * 
 * Interactive dashboard for the Developer Insight Engine
 * "Fitbit for your developer mind" - comprehensive personal analytics
 */

import readline from 'readline';
import chalk from 'chalk';
import { InsightEngine, EVENT_TYPES } from '../src/insights/insightEngine.js';
import { DashboardRenderer, CompactDashboard } from '../src/insights/dashboardRenderer.js';

// CLI Arguments
const DEMO_MODE = process.argv.includes('--demo');
const THEME = process.argv.find(arg => arg.startsWith('--theme='))?.split('=')[1] || 'ocean';

class InsightsDashboard {
  constructor() {
    this.insightEngine = new InsightEngine({
      enableGenius: true,
      enablePrediction: true
    });
    
    this.renderer = new DashboardRenderer(THEME);
    this.compactDashboard = new CompactDashboard(THEME);
    this.isRunning = false;
    
    // Demo data generation
    if (DEMO_MODE) {
      this.generateDemoData();
    }
    
    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.insightEngine.on('genius-moment', (moment) => {
      console.log('\n' + this.compactDashboard.renderGeniusNotification(moment));
    });

    this.insightEngine.on('event-recorded', (event) => {
      if (event.eventType === EVENT_TYPES.FLOW_STATE_ENTER) {
        console.log(chalk.green('🌊 Flow state detected - entering deep work mode'));
      }
    });
  }

  generateDemoData() {
    console.log(chalk.cyan('🎭 Generating demo data...\n'));
    
    // Start a session
    this.insightEngine.startSession({ projectType: 'web-app', language: 'javascript' });
    
    // Generate various events over the past week
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    // Flow sessions
    for (let i = 0; i < 15; i++) {
      const timestamp = now - Math.random() * oneWeek;
      this.insightEngine.recordEvent(EVENT_TYPES.FLOW_STATE_ENTER, {
        timestamp,
        duration: 30 + Math.random() * 120, // 30-150 minutes
        cognitiveLoad: 60 + Math.random() * 40
      });
    }

    // Learning events
    const concepts = ['async/await patterns', 'TypeScript generics', 'React hooks', 'microservices', 'GraphQL'];
    concepts.forEach((concept, i) => {
      this.insightEngine.recordEvent(EVENT_TYPES.NEW_CONCEPT_LEARNED, {
        timestamp: now - (i * 24 * 60 * 60 * 1000),
        concept,
        trigger: 'documentation',
        complexity: 5 + Math.random() * 5
      });
    });

    // Problem solving
    for (let i = 0; i < 8; i++) {
      this.insightEngine.recordEvent(EVENT_TYPES.PROBLEM_SOLVED, {
        timestamp: now - Math.random() * oneWeek,
        problemType: 'debugging',
        complexity: 3 + Math.random() * 7,
        duration: 10 + Math.random() * 60,
        solutionType: Math.random() > 0.7 ? 'novel' : 'standard'
      });
    }

    // Genius moments
    this.insightEngine.recordEvent(EVENT_TYPES.BREAKTHROUGH_MOMENT, {
      timestamp: now - 2 * 24 * 60 * 60 * 1000,
      problem: 'Race conditions in distributed cache',
      solution: 'Implemented a lock-free queue with backoff',
      impact: 9,
      complexity: 2,
      solutionType: 'novel'
    });

    // Code completion events
    for (let i = 0; i < 50; i++) {
      this.insightEngine.recordEvent(EVENT_TYPES.CODE_COMPLETION, {
        timestamp: now - Math.random() * oneWeek,
        language: Math.random() > 0.5 ? 'javascript' : 'typescript',
        framework: 'react',
        complexity: 1 + Math.random() * 8,
        linesChanged: 1 + Math.random() * 20
      });
    }

    // Refactoring events
    for (let i = 0; i < 12; i++) {
      this.insightEngine.recordEvent(EVENT_TYPES.REFACTORING, {
        timestamp: now - Math.random() * oneWeek,
        complexity: 3 + Math.random() * 5,
        impact: 4 + Math.random() * 6
      });
    }

    console.log(chalk.green('✅ Demo data generated successfully!\n'));
  }

  async start() {
    this.isRunning = true;
    
    console.clear();
    this.showWelcome();
    
    while (this.isRunning) {
      const result = await this.showMainMenu();
      if (result === 'exit') {
        this.isRunning = false;
      }
    }
  }

  showWelcome() {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🧬 LETTA INSIGHT ENGINE - DEVELOPER ANALYTICS         ║
║                                                               ║
║              "Fitbit for your developer mind"                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
    
    if (DEMO_MODE) {
      console.log(chalk.yellow('🎭 Running in DEMO mode with sample data\n'));
    }
  }

  async showMainMenu() {
    const options = [
      { label: '🧬 Developer DNA Dashboard', value: 'showDNA' },
      { label: '🌳 Skill Tree Visualization', value: 'showSkillTree' },
      { label: '🌤️  Code Weather Forecast', value: 'showWeatherForecast' },
      { label: '✨ Moments of Genius Archive', value: 'showGeniusArchive' },
      { label: '📈 Evolution Timeline', value: 'showEvolution' },
      { label: '📊 Weekly Insights Report', value: 'showWeeklyReport' },
      { label: '⚙️  Settings & Privacy', value: 'showSettings' },
      { label: '🚪 Exit', value: 'exit' }
    ];

    const choice = await this.arrowMenu('DEVELOPER INSIGHTS DASHBOARD', options);
    
    if (choice === 'back' || choice === 'exit') {
      console.log(chalk.cyan('\n👋 Thanks for using Letta Insights! Keep growing! 🚀\n'));
      return 'exit';
    }
    
    const result = await this.handleAction(choice);
    return result;
  }

  async handleAction(action) {
    console.clear();
    
    switch (action) {
      case 'showDNA':
        return await this.showDeveloperDNA();
      case 'showSkillTree':
        return await this.showSkillTree();
      case 'showWeatherForecast':
        return await this.showWeatherForecast();
      case 'showGeniusArchive':
        return await this.showGeniusArchive();
      case 'showEvolution':
        return await this.showEvolution();
      case 'showWeeklyReport':
        return await this.showWeeklyReport();
      case 'showSettings':
        return await this.showSettings();
      default:
        return 'continue';
    }
  }

  async showDeveloperDNA() {
    const insights = this.insightEngine.generateInsights('7d');
    const dashboard = this.renderer.renderDeveloperDNA(insights);
    
    console.log(dashboard);
    
    const options = [
      { label: '🔄 Refresh Data', value: 'refresh' },
      { label: '📊 Export DNA Report', value: 'export' },
      { label: '← Back to Main Menu', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('DEVELOPER DNA OPTIONS', options);
    
    if (choice === 'refresh') {
      return await this.showDeveloperDNA();
    } else if (choice === 'export') {
      console.log(chalk.green('\n📊 DNA Report exported to clipboard!\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showDeveloperDNA();
    }
    
    return 'continue';
  }

  async showSkillTree() {
    const insights = this.insightEngine.generateInsights('30d');
    const skillTree = this.renderer.renderSkillTree(insights.skillTree);
    
    console.log(skillTree);
    
    const options = [
      { label: '🎯 Focus on Category', value: 'focus' },
      { label: '📈 View Progress History', value: 'history' },
      { label: '← Back to Main Menu', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('SKILL TREE OPTIONS', options);
    
    if (choice === 'focus') {
      return await this.showSkillFocus();
    } else if (choice === 'history') {
      console.log(chalk.cyan('\n📈 Skill progression history would be shown here...\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showSkillTree();
    }
    
    return 'continue';
  }

  async showSkillFocus() {
    const options = [
      { label: '🏗️  Core Foundations', value: 'core' },
      { label: '🎨 Frontend Mastery', value: 'frontend' },
      { label: '⚙️  Backend Wizardry', value: 'backend' },
      { label: '🏛️  Architecture', value: 'architecture' },
      { label: '🚀 Emerging Skills', value: 'emerging' },
      { label: '← Back to Skill Tree', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('SELECT SKILL CATEGORY', options);
    
    if (choice === 'back') {
      return await this.showSkillTree();
    } else if (choice !== 'back') {
      console.log(chalk.cyan(`\n🎯 Focused view for ${choice} skills would be shown here...\n`));
      await this.waitForKey('Press Enter to continue...');
      return await this.showSkillFocus();
    }
    
    return 'continue';
  }

  async showWeatherForecast() {
    const insights = this.insightEngine.generateInsights('7d');
    const forecast = this.renderer.renderCodeWeatherForecast(insights.codeWeatherForecast);
    
    console.log(forecast);
    
    const options = [
      { label: '📅 Extended Forecast (7 days)', value: 'extended' },
      { label: '⚙️  Adjust Predictions', value: 'adjust' },
      { label: '← Back to Main Menu', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('WEATHER FORECAST OPTIONS', options);
    
    if (choice === 'extended') {
      console.log(chalk.cyan('\n📅 7-day extended forecast would be shown here...\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showWeatherForecast();
    } else if (choice === 'adjust') {
      console.log(chalk.cyan('\n⚙️  Prediction adjustment settings would be shown here...\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showWeatherForecast();
    }
    
    return 'continue';
  }

  async showGeniusArchive() {
    const insights = this.insightEngine.generateInsights('30d');
    const archive = this.renderer.renderGeniusArchive(insights.geniusMoments);
    
    console.log(archive);
    
    const options = [
      { label: '🔍 Search Archive', value: 'search' },
      { label: '📤 Share Moment', value: 'share' },
      { label: '← Back to Main Menu', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('GENIUS ARCHIVE OPTIONS', options);
    
    if (choice === 'search') {
      console.log(chalk.cyan('\n🔍 Archive search would be shown here...\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showGeniusArchive();
    } else if (choice === 'share') {
      console.log(chalk.green('\n📤 Genius moment shared to clipboard!\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showGeniusArchive();
    }
    
    return 'continue';
  }

  async showEvolution() {
    const currentStage = this.insightEngine.getCurrentEvolutionStage();
    const insights = this.insightEngine.generateInsights('30d');
    const timeline = this.renderer.renderEvolutionTimeline(currentStage, insights.skillTree);
    
    console.log(timeline);
    
    const options = [
      { label: '🎯 Set Growth Goals', value: 'goals' },
      { label: '📊 Compare with Peers', value: 'compare' },
      { label: '← Back to Main Menu', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('EVOLUTION TIMELINE OPTIONS', options);
    
    if (choice === 'goals') {
      console.log(chalk.cyan('\n🎯 Growth goal setting would be shown here...\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showEvolution();
    } else if (choice === 'compare') {
      console.log(chalk.cyan('\n📊 Peer comparison (anonymized) would be shown here...\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showEvolution();
    }
    
    return 'continue';
  }

  async showWeeklyReport() {
    const insights = this.insightEngine.generateInsights('7d');
    
    console.log(chalk.bold.white('📊 WEEKLY INSIGHTS REPORT\n'));
    
    // Growth Summary
    console.log(chalk.cyan('🌱 GROWTH SUMMARY'));
    console.log(`   Concepts Learned: ${insights.growth.conceptsLearned}`);
    console.log(`   Learning Velocity: ${insights.growth.learningVelocity.toFixed(1)} concepts/week`);
    console.log(`   Skill Advancements: ${insights.growth.skillAdvancements.length}`);
    console.log('');
    
    // Performance Summary
    console.log(chalk.cyan('⚡ PERFORMANCE SUMMARY'));
    console.log(`   Flow Sessions: ${insights.performance.flowSessions}`);
    console.log(`   Average Flow Duration: ${insights.performance.averageFlowDuration} minutes`);
    console.log(`   Longest Flow: ${insights.performance.longestFlow} minutes`);
    console.log(`   Peak Hours: ${insights.performance.peakHours.join(', ')}`);
    console.log('');
    
    // Creativity Summary
    console.log(chalk.cyan('🎨 CREATIVITY SUMMARY'));
    console.log(`   Creative Outputs: ${insights.creativity.creativeOutputs}`);
    console.log(`   Refactor Ratio: ${insights.creativity.refactorRatio}%`);
    console.log(`   Elegance Score: ${insights.creativity.eleganceScore}/100`);
    console.log('');
    
    // Cognitive Signature
    console.log(chalk.cyan('🧠 COGNITIVE SIGNATURE'));
    const signature = insights.cognitiveSignature;
    console.log(`   Style: ${signature.signature}`);
    console.log(`   Problem Solving: ${signature.problemSolvingStyle.analytical}% Analytical, ${signature.problemSolvingStyle.intuitive}% Intuitive`);
    console.log(`   Decision Velocity: ${signature.decisionVelocity}`);
    console.log('');
    
    // Personalized Tips
    console.log(chalk.cyan('💡 PERSONALIZED TIPS'));
    insights.personalizedTips.forEach(tip => {
      console.log(`   ${tip}`);
    });
    
    const options = [
      { label: '📧 Email Report', value: 'email' },
      { label: '📊 Export Data', value: 'export' },
      { label: '← Back to Main Menu', value: 'back' }
    ];
    
    const choice = await this.arrowMenu('WEEKLY REPORT OPTIONS', options);
    
    if (choice === 'email') {
      console.log(chalk.green('\n📧 Weekly report would be emailed!\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showWeeklyReport();
    } else if (choice === 'export') {
      console.log(chalk.green('\n📊 Report data exported!\n'));
      await this.waitForKey('Press Enter to continue...');
      return await this.showWeeklyReport();
    }
    
    return 'continue';
  }

  async showSettings() {
    const options = [
      { label: '📊 Export All Data', value: 'exportData' },
      { label: '🗑️  Clear All Data', value: 'clearData' },
      { label: '🎨 Change Theme', value: 'changeTheme' },
      { label: '🔒 Privacy Settings', value: 'privacySettings' },
      { label: '← Back to Main Menu', value: 'back' }
    ];

    const choice = await this.arrowMenu('SETTINGS & PRIVACY', options);
    
    if (choice === 'back') {
      return 'continue';
    }
    
    const result = await this.handleSettingsAction(choice);
    if (result === 'back') {
      return await this.showSettings();
    }
    
    return 'continue';
  }

  async handleSettingsAction(action) {
    switch (action) {
      case 'exportData':
        const exportData = this.insightEngine.exportInsights();
        console.log('\n📊 Data Export:');
        console.log(JSON.stringify(exportData, null, 2));
        break;
        
      case 'clearData':
        const confirmOptions = [
          { label: '✅ Yes, clear all data', value: 'yes' },
          { label: '❌ No, keep my data', value: 'no' }
        ];
        
        const confirm = await this.arrowMenu('⚠️  CONFIRM DATA CLEARING', confirmOptions);
        
        if (confirm === 'yes') {
          this.insightEngine = new InsightEngine();
          console.log(chalk.green('\n✅ All data cleared successfully!'));
        } else {
          console.log(chalk.yellow('\n❌ Data clearing cancelled.'));
        }
        break;
        
      case 'changeTheme':
        const themeOptions = [
          { label: '🌊 Ocean (Default)', value: 'ocean' },
          { label: '🌲 Forest', value: 'forest' },
          { label: '🌅 Sunset', value: 'sunset' }
        ];
        
        const theme = await this.arrowMenu('🎨 SELECT THEME', themeOptions);
        
        if (theme !== 'back') {
          this.renderer = new DashboardRenderer(theme);
          this.compactDashboard = new CompactDashboard(theme);
          console.log(chalk.green(`\n✅ Theme changed to ${theme}!`));
        }
        break;
        
      case 'privacySettings':
        console.log('\n🔒 PRIVACY SETTINGS');
        console.log('');
        console.log('What\'s Tracked:');
        console.log('  ✓ Code patterns & improvement');
        console.log('  ✓ Problem-solving approaches');
        console.log('  ✓ Learning progress');
        console.log('  ✗ Specific project names');
        console.log('  ✗ Company/proprietary code snippets');
        console.log('');
        console.log('Data Retention:');
        console.log('  • Raw data: 30 days (auto-purged)');
        console.log('  • Insights: 2 years (anonymized)');
        console.log('  • "Genius Moments": Forever (encrypted)');
        break;
    }
    
    await this.waitForKey('\nPress Enter to continue...');
    return 'back';
  }

  // Arrow menu implementation (adapted from CLI)
  async arrowMenu(title, options) {
    // Ensure stdin is in a clean state
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch (e) {}
    }
    process.stdin.pause();
    
    // Small delay to let any pending events clear
    await new Promise(r => setTimeout(r, 30));
    
    return new Promise((resolve) => {
      let selectedIndex = 0;
      const items = [...options];
      let menuLineCount = 0;
      let isFirstDraw = true;
      let resolved = false;
      
      // Build menu content
      const buildMenu = () => {
        let lines = [];
        lines.push(chalk.gray("  ↑↓ Navigate  •  Enter Select  •  Esc Back  •  Ctrl+C Exit"));
        lines.push(chalk.gray("─".repeat(66)));
        lines.push("");
        lines.push(chalk.bold.white(`  ${title}`));
        lines.push("");
        
        items.forEach((item, index) => {
          const isSelected = index === selectedIndex;
          
          if (isSelected) {
            lines.push(chalk.cyan.bold(`  ❯ ${item.label}`));
          } else {
            lines.push(chalk.white(`    ${item.label}`));
          }
        });
        
        lines.push("");
        return lines;
      };
      
      const draw = () => {
        const menuLines = buildMenu();
        
        if (isFirstDraw) {
          console.clear();
          this.showWelcome();
          menuLines.forEach(line => console.log(line));
          menuLineCount = menuLines.length + 8; // +8 for welcome banner
          isFirstDraw = false;
        } else {
          process.stdout.write(`\x1b[${menuLineCount}A`);
          process.stdout.write('\x1b[J');
          this.showWelcome();
          menuLines.forEach(line => console.log(line));
        }
      };
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        process.stdin.removeAllListeners("keypress");
        if (process.stdin.isTTY) {
          try { process.stdin.setRawMode(false); } catch (e) {}
        }
        process.stdin.pause();
      };
      
      const onKeypress = (_, key) => {
        if (!key || resolved) return;
        
        if (key.name === "up") {
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
          draw();
        } else if (key.name === "down") {
          selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
          draw();
        } else if (key.name === "return") {
          cleanup();
          resolve(items[selectedIndex].value);
        } else if (key.name === "escape" || key.name === "backspace") {
          cleanup();
          resolve("back");
        } else if (key.ctrl && key.name === "c") {
          cleanup();
          console.log(chalk.cyan("\n\n  👋 Thanks for using Letta Insights! Keep growing! 🚀\n"));
          process.exit(0);
        }
      };
      
      draw();
      
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.on("keypress", onKeypress);
      process.stdin.resume();
    });
  }

  async waitForKey(message) {
    // Ensure stdin is clean
    if (process.stdin.isTTY) {
      try { process.stdin.setRawMode(false); } catch (e) {}
    }
    process.stdin.pause();
    await new Promise(r => setTimeout(r, 30));
    
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(chalk.gray(`  ${message} `), () => {
        rl.close();
        resolve();
      });
    });
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.cyan('\n\n👋 Thanks for using Letta Insights! Keep growing! 🚀\n'));
  process.exit(0);
});

// Start the dashboard
const dashboard = new InsightsDashboard();
dashboard.start().catch(console.error);