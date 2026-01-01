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
      await this.showMainMenu();
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
      { key: '1', label: '🧬 Developer DNA Dashboard', action: 'showDNA' },
      { key: '2', label: '🌳 Skill Tree Visualization', action: 'showSkillTree' },
      { key: '3', label: '🌤️  Code Weather Forecast', action: 'showWeatherForecast' },
      { key: '4', label: '✨ Moments of Genius Archive', action: 'showGeniusArchive' },
      { key: '5', label: '📈 Evolution Timeline', action: 'showEvolution' },
      { key: '6', label: '📊 Weekly Insights Report', action: 'showWeeklyReport' },
      { key: '7', label: '⚙️  Settings & Privacy', action: 'showSettings' },
      { key: 'q', label: '🚪 Exit', action: 'exit' }
    ];

    console.log(chalk.bold.white('Select an option:\n'));
    
    options.forEach(option => {
      console.log(`  ${chalk.cyan(option.key)}. ${option.label}`);
    });
    
    console.log('');
    const choice = await this.getInput('Enter your choice: ');
    
    const selectedOption = options.find(opt => opt.key === choice.toLowerCase());
    if (selectedOption) {
      await this.handleAction(selectedOption.action);
    } else {
      console.log(chalk.red('Invalid choice. Please try again.\n'));
    }
  }

  async handleAction(action) {
    console.clear();
    
    switch (action) {
      case 'showDNA':
        await this.showDeveloperDNA();
        break;
      case 'showSkillTree':
        await this.showSkillTree();
        break;
      case 'showWeatherForecast':
        await this.showWeatherForecast();
        break;
      case 'showGeniusArchive':
        await this.showGeniusArchive();
        break;
      case 'showEvolution':
        await this.showEvolution();
        break;
      case 'showWeeklyReport':
        await this.showWeeklyReport();
        break;
      case 'showSettings':
        await this.showSettings();
        break;
      case 'exit':
        this.isRunning = false;
        console.log(chalk.cyan('\n👋 Thanks for using Letta Insights! Keep growing! 🚀\n'));
        return;
    }
    
    await this.waitForKey('\nPress Enter to return to main menu...');
    console.clear();
  }

  async showDeveloperDNA() {
    const insights = this.insightEngine.generateInsights('7d');
    const dashboard = this.renderer.renderDeveloperDNA(insights);
    
    console.log(dashboard);
  }

  async showSkillTree() {
    const insights = this.insightEngine.generateInsights('30d');
    const skillTree = this.renderer.renderSkillTree(insights.skillTree);
    
    console.log(skillTree);
  }

  async showWeatherForecast() {
    const insights = this.insightEngine.generateInsights('7d');
    const forecast = this.renderer.renderCodeWeatherForecast(insights.codeWeatherForecast);
    
    console.log(forecast);
  }

  async showGeniusArchive() {
    const insights = this.insightEngine.generateInsights('30d');
    const archive = this.renderer.renderGeniusArchive(insights.geniusMoments);
    
    console.log(archive);
  }

  async showEvolution() {
    const currentStage = this.insightEngine.getCurrentEvolutionStage();
    const insights = this.insightEngine.generateInsights('30d');
    const timeline = this.renderer.renderEvolutionTimeline(currentStage, insights.skillTree);
    
    console.log(timeline);
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
  }

  async showSettings() {
    console.log(chalk.bold.white('⚙️ SETTINGS & PRIVACY\n'));
    
    const options = [
      { key: '1', label: '📊 Export All Data', action: 'exportData' },
      { key: '2', label: '🗑️  Clear All Data', action: 'clearData' },
      { key: '3', label: '🎨 Change Theme', action: 'changeTheme' },
      { key: '4', label: '🔒 Privacy Settings', action: 'privacySettings' },
      { key: 'b', label: '← Back to Main Menu', action: 'back' }
    ];

    options.forEach(option => {
      console.log(`  ${chalk.cyan(option.key)}. ${option.label}`);
    });
    
    console.log('');
    const choice = await this.getInput('Enter your choice: ');
    
    const selectedOption = options.find(opt => opt.key === choice.toLowerCase());
    if (selectedOption) {
      await this.handleSettingsAction(selectedOption.action);
    }
  }

  async handleSettingsAction(action) {
    switch (action) {
      case 'exportData':
        const exportData = this.insightEngine.exportInsights();
        console.log('\n📊 Data Export:');
        console.log(JSON.stringify(exportData, null, 2));
        break;
        
      case 'clearData':
        const confirm = await this.getInput('\n⚠️  Are you sure you want to clear all data? (yes/no): ');
        if (confirm.toLowerCase() === 'yes') {
          this.insightEngine = new InsightEngine();
          console.log(chalk.green('\n✅ All data cleared successfully!'));
        } else {
          console.log(chalk.yellow('\n❌ Data clearing cancelled.'));
        }
        break;
        
      case 'changeTheme':
        console.log('\n🎨 Available themes: ocean, forest, sunset');
        const theme = await this.getInput('Enter theme name: ');
        this.renderer = new DashboardRenderer(theme);
        this.compactDashboard = new CompactDashboard(theme);
        console.log(chalk.green(`\n✅ Theme changed to ${theme}!`));
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
        
      case 'back':
        return;
    }
    
    await this.waitForKey('\nPress Enter to continue...');
  }

  async getInput(prompt) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  async waitForKey(message) {
    await this.getInput(message);
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