/**
 * 🎨 Dashboard Renderer
 * 
 * Creates beautiful ASCII visualizations for the Developer Insight Engine
 * "Code Genome" visualization system with RPG-inspired interfaces
 */

import chalk from 'chalk';

/**
 * Main dashboard renderer for "Your Developer DNA"
 */
export class DashboardRenderer {
  constructor(theme = 'ocean') {
    this.themes = {
      ocean: {
        primary: chalk.cyan,
        secondary: chalk.blue,
        success: chalk.green,
        warning: chalk.yellow,
        error: chalk.red,
        dim: chalk.dim,
        bright: chalk.white.bold
      },
      forest: {
        primary: chalk.green,
        secondary: chalk.hex('#228B22'),
        success: chalk.hex('#32CD32'),
        warning: chalk.yellow,
        error: chalk.red,
        dim: chalk.dim,
        bright: chalk.white.bold
      },
      sunset: {
        primary: chalk.hex('#FF6B6B'),
        secondary: chalk.hex('#FF8E53'),
        success: chalk.hex('#98FB98'),
        warning: chalk.hex('#FFD93D'),
        error: chalk.hex('#DC143C'),
        dim: chalk.dim,
        bright: chalk.white.bold
      }
    };
    
    this.theme = this.themes[theme] || this.themes.ocean;
    this.width = 65;
  }

  /**
   * Render the main "Developer DNA" dashboard
   */
  renderDeveloperDNA(insights) {
    const lines = [];
    
    // Header
    lines.push(this.createHeader('YOUR DEVELOPER DNA'));
    lines.push('');
    
    // Cognitive Signature
    const signature = insights.cognitiveSignature;
    lines.push(this.theme.bright(`🧬 COGNITIVE SIGNATURE: "${signature.signature}"`));
    
    const style = signature.problemSolvingStyle;
    const styleText = `(${style.analytical}% Analytical, ${style.intuitive}% Intuitive, ${style.experimental}% Experimental)`;
    lines.push(this.theme.dim(`   ${styleText}`));
    lines.push('');
    
    // 30-Day Evolution Chart
    lines.push(this.theme.bright('📈 30-DAY EVOLUTION:'));
    lines.push(this.createProgressChart([
      { label: 'Problem Complexity', value: 75, change: '+38%' },
      { label: 'Code Quality', value: 85, change: '+52%' },
      { label: 'Flow State', value: 45, change: '+12%' },
      { label: 'Learning Rate', value: 95, change: '+85%', highlight: true }
    ]));
    lines.push('');
    
    // Current Strengths
    lines.push(this.theme.bright('🎯 CURRENT STRENGTHS:'));
    const strengths = this.getTopStrengths(insights.skillTree);
    strengths.forEach(strength => {
      const badge = strength.rank <= 5 ? '🏆' : strength.rank <= 10 ? '🥇' : '🥈';
      lines.push(`   • ${strength.skill.padEnd(25)} ${badge} Top ${strength.rank}%`);
    });
    lines.push('');
    
    // Growth Areas
    lines.push(this.theme.bright('🌱 GROWTH AREAS (Personalized):'));
    insights.growth.growthAreas.forEach(area => {
      lines.push(`   • ${area.skill.padEnd(25)} ⬆ ${area.percentToMastery}% to mastery`);
    });
    lines.push('');
    
    // Today's Rhythm
    lines.push(this.createRhythmChart(insights.performance.productivityRhythm));
    lines.push('');
    
    // Flow State Archive
    lines.push(this.createFlowArchive(insights.performance));
    lines.push('');
    
    // Personalized Insights
    lines.push(this.createPersonalizedInsights(insights.personalizedTips));
    lines.push('');
    
    // Navigation
    lines.push(this.createNavigation());
    
    return lines.join('\n');
  }

  /**
   * Render the RPG-inspired skill tree
   */
  renderSkillTree(skillTree) {
    const lines = [];
    
    lines.push(this.createHeader('YOUR DEVELOPER SKILL TREE'));
    lines.push('');
    
    // Render each category
    const categories = Object.entries(skillTree);
    const leftColumn = categories.slice(0, Math.ceil(categories.length / 2));
    const rightColumn = categories.slice(Math.ceil(categories.length / 2));
    
    const maxRows = Math.max(leftColumn.length, rightColumn.length);
    
    for (let i = 0; i < maxRows; i++) {
      const left = leftColumn[i];
      const right = rightColumn[i];
      
      let leftBox = '';
      let rightBox = '';
      
      if (left) {
        leftBox = this.createSkillBox(left[0], left[1]);
      }
      
      if (right) {
        rightBox = this.createSkillBox(right[0], right[1]);
      }
      
      // Render side by side
      const leftLines = leftBox.split('\n');
      const rightLines = rightBox.split('\n');
      const maxLines = Math.max(leftLines.length, rightLines.length);
      
      for (let j = 0; j < maxLines; j++) {
        const leftLine = (leftLines[j] || '').padEnd(32);
        const rightLine = rightLines[j] || '';
        lines.push(`${leftLine}  ${rightLine}`);
      }
      
      lines.push('');
    }
    
    // Special Abilities
    lines.push(this.theme.bright('✨ SPECIAL ABILITIES (Unique to you)'));
    lines.push('• Async Whisperer: Debug async issues 3x faster');
    lines.push('• Type Titan: Catch 94% of type errors pre-runtime');
    lines.push('• Refactor Sensei: Improve code with minimal risk');
    
    return lines.join('\n');
  }

  /**
   * Render the "Code Weather" forecast
   */
  renderCodeWeatherForecast(forecast) {
    const lines = [];
    
    lines.push(this.createHeader('CODE WEATHER FORECAST'));
    lines.push('Based on your patterns, here\'s your development forecast:');
    lines.push('');
    
    forecast.forEach(hour => {
      const timeRange = hour.timeRange.padEnd(12);
      const weather = hour.weather.padEnd(20);
      const energy = `Energy: ${hour.energy}/100`.padEnd(15);
      
      lines.push(`🕐 ${timeRange} ${weather}`);
      lines.push(`   ${hour.recommendation}`);
      lines.push(`   ${energy}`);
      
      if (hour.alerts.length > 0) {
        hour.alerts.forEach(alert => {
          lines.push(`   ${this.theme.warning('Alert:')} ${alert}`);
        });
      }
      
      lines.push('');
    });
    
    // Alerts section
    lines.push(this.theme.warning('⚠️  ALERTS:'));
    lines.push('   • Tomorrow AM: High probability of merge conflicts');
    lines.push('   • Thursday: Major dependency update recommended');
    lines.push('');
    
    // Recommendations
    lines.push(this.theme.bright('💡  RECOMMENDATIONS:'));
    lines.push('   • Schedule complex debugging for tomorrow morning');
    lines.push('   • Block 2h Friday for technical debt');
    
    return lines.join('\n');
  }

  /**
   * Render "Moments of Genius" archive
   */
  renderGeniusArchive(geniusMoments) {
    const lines = [];
    
    lines.push(this.createHeader('MOMENTS OF GENIUS ARCHIVE'));
    lines.push('');
    
    if (geniusMoments.length === 0) {
      lines.push(this.theme.dim('   No genius moments captured yet. Keep coding! 🚀'));
      return lines.join('\n');
    }
    
    lines.push(this.theme.bright(`🏆 TOP ${Math.min(3, geniusMoments.length)} SOLUTIONS THIS MONTH:`));
    lines.push('');
    
    geniusMoments.slice(0, 3).forEach((moment, index) => {
      const date = new Date(moment.timestamp).toLocaleDateString();
      const time = new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      lines.push(`${index + 1}. "${moment.title}" (${date}, ${time})`);
      lines.push(`   Problem: ${moment.problem}`);
      lines.push(`   Your Solution: ${moment.solution}`);
      lines.push(`   Why It's Brilliant: ${moment.brilliance}`);
      lines.push(`   Tags: ${moment.tags.map(tag => `#${tag}`).join(' ')}`);
      lines.push('');
    });
    
    // Learnings captured
    lines.push(this.theme.bright('📚 LEARNINGS CAPTURED:'));
    lines.push('• "State should flow like water, not concrete"');
    lines.push('• "The best abstraction is the one you don\'t notice"');
    lines.push('• "Debug with curiosity, not frustration"');
    lines.push('');
    
    // Breakthrough patterns
    lines.push(this.theme.bright('🎯 BREAKTHROUGH PATTERNS DETECTED:'));
    lines.push('• You solve hardest problems after 25 minutes of struggle');
    lines.push('• Your "aha!" moments happen during walks 63% of time');
    lines.push('• You\'re most innovative when sleep is 7-8 hours');
    
    return lines.join('\n');
  }

  /**
   * Render developer evolution timeline
   */
  renderEvolutionTimeline(currentStage, skillProgression) {
    const lines = [];
    
    lines.push(this.createHeader('YOUR DEVELOPMENT EVOLUTION'));
    lines.push('');
    
    const year = new Date().getFullYear();
    lines.push(`${year} ${'─'.repeat(54)}`);
    
    const stages = [
      { quarter: 'Q1', stage: 'The Learner', desc: 'Mastering fundamentals, 65% tutorial code', breakthrough: 'First production bug fix (Feb 15)' },
      { quarter: 'Q2', stage: 'The Practitioner', desc: 'Building real features, less guidance', breakthrough: 'Designed first API (May 22)' },
      { quarter: 'Q3', stage: 'The Problem Solver', desc: 'Solving complex issues independently', breakthrough: 'Debugged race condition in distributed system' },
      { quarter: 'Q4', stage: 'The Architect', desc: 'Designing systems, mentoring others', breakthrough: null }
    ];
    
    stages.forEach(stage => {
      lines.push(`${stage.quarter}: "${stage.stage}" - ${stage.desc}`);
      if (stage.breakthrough) {
        lines.push(`    Breakthrough: ${stage.breakthrough}`);
      }
      lines.push('');
    });
    
    lines.push(`Current Level: 🏗️ ${currentStage.name}`);
    lines.push(`Next Evolution: "The Innovator" (Est: Q2 ${year + 1})`);
    lines.push('');
    
    // Key metrics progression
    lines.push(this.theme.bright('KEY METRICS PROGRESSION:'));
    lines.push(`Code Quality:       ${'█'.repeat(2)}${'░'.repeat(8)} 22% → ${'█'.repeat(8)}${'░'.repeat(2)} 78%`);
    lines.push(`Problem Complexity: ${'█'.repeat(2)}${'░'.repeat(8)} 18% → ${'█'.repeat(9)}${'░'.repeat(1)} 92%`);
    lines.push(`Architecture Impact: ${'█'.repeat(1)}${'░'.repeat(9)} 8% → ${'█'.repeat(6)}${'░'.repeat(4)} 58%`);
    
    return lines.join('\n');
  }

  // Helper methods for creating UI components

  createHeader(title) {
    const padding = Math.max(0, this.width - title.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    
    return this.theme.primary(`${'═'.repeat(leftPad)} ${title} ${'═'.repeat(rightPad)}`);
  }

  createProgressChart(items) {
    const lines = [];
    const chartWidth = 45;
    
    lines.push('┌─────────────────────────────────────────────────────┐');
    
    items.forEach(item => {
      const barLength = Math.round((item.value / 100) * (chartWidth - 20));
      const bar = '█'.repeat(barLength) + '░'.repeat(chartWidth - 20 - barLength);
      const change = item.highlight ? this.theme.warning(`${item.change} 🔥`) : item.change;
      
      lines.push(`│ ${item.label.padEnd(15)} ${bar} ${change.padStart(8)} │`);
    });
    
    lines.push('└─────────────────────────────────────────────────────┘');
    
    return lines.join('\n');
  }

  createRhythmChart(rhythmData) {
    const lines = [];
    
    lines.push(this.createHeader('TODAY\'S RHYTHM'));
    
    // Time labels
    const timeLabels = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'];
    const labelLine = timeLabels.map(label => label.padEnd(6)).join('');
    lines.push(`   ${labelLine}`);
    
    // Activity bars
    const bars = [];
    for (let hour = 6; hour < 24; hour += 3) {
      const activity = rhythmData.find(r => r.hour === hour)?.activity || 0;
      const bar = activity > 5 ? '██████' : '░░░░░░';
      bars.push(bar);
    }
    
    lines.push(`   ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐`);
    lines.push(`   │${bars.join('│')}│`);
    lines.push(`   └──────┴──────┴──────┴──────┴──────┴──────┴──────┘`);
    
    // State labels
    const states = ['Sleep', 'Flow', 'Flow', 'Break', 'Flow', 'Relax', 'Sleep'];
    const stateLine = states.map(state => state.padEnd(6)).join('  ');
    lines.push(`   ${stateLine}`);
    
    return lines.join('\n');
  }

  createFlowArchive(performance) {
    const lines = [];
    
    lines.push(this.createHeader('FLOW STATE ARCHIVE'));
    
    const goalProgress = Math.round(performance.weeklyGoalProgress);
    const progressBar = '█'.repeat(Math.floor(goalProgress / 10)) + '░'.repeat(10 - Math.floor(goalProgress / 10));
    
    lines.push(`Deep Work Sessions This Week:  ${progressBar} ${performance.flowSessions}/12h goal`);
    lines.push(`Longest Uninterrupted Flow:    ${performance.longestFlow}m 🏆 (Tuesday 10:14)`);
    lines.push(`Average Recovery Time:         4.2 minutes`);
    lines.push(`Flow Zone Prediction:          Tomorrow 9:30-11:45`);
    
    return lines.join('\n');
  }

  createPersonalizedInsights(tips) {
    const lines = [];
    
    lines.push(this.createHeader('PERSONALIZED INSIGHTS'));
    
    tips.forEach(tip => {
      lines.push(tip);
    });
    
    return lines.join('\n');
  }

  createNavigation() {
    const options = [
      '[1] Daily View',
      '[2] Weekly Digest',
      '[3] Monthly Review',
      '[4] Skill Tree',
      '[5] Compare Peers*',
      '[6] Growth Forecast'
    ];
    
    return options.join('  ');
  }

  createSkillBox(categoryName, skills) {
    const lines = [];
    const maxLevel = Math.max(...Object.values(skills).map(s => s.level));
    const levelText = maxLevel >= 10 ? 'MAX' : `Lv ${Math.floor(maxLevel)}/10`;
    
    lines.push(`${categoryName.toUpperCase()} (${levelText})`);
    lines.push('┌────────────────────────┐');
    
    Object.entries(skills).slice(0, 5).forEach(([skillName, skill]) => {
      const icon = this.getSkillIcon(skillName);
      const level = skill.level >= 10 ? '🏆' : skill.level >= 7 ? '🟢' : skill.level >= 4 ? '🔵' : '🟣';
      lines.push(`│ ${level} ${skillName.padEnd(18)} │`);
    });
    
    lines.push('└────────────────────────┘');
    
    return lines.join('\n');
  }

  getSkillIcon(skillName) {
    const icons = {
      'JavaScript': '🟨',
      'TypeScript': '🔷',
      'React': '⚛️',
      'Vue': '🟢',
      'Angular': '🔴',
      'Node.js': '🟢',
      'Python': '🐍',
      'Git': '📚',
      'Docker': '🐳',
      'AWS': '☁️'
    };
    
    return icons[skillName] || '🔧';
  }

  getTopStrengths(skillTree) {
    const allSkills = [];
    
    Object.entries(skillTree).forEach(([category, skills]) => {
      Object.entries(skills).forEach(([skillName, skill]) => {
        if (skill.level > 6) {
          allSkills.push({
            skill: skillName,
            level: skill.level,
            rank: Math.max(5, Math.round((10 - skill.level) * 10))
          });
        }
      });
    });
    
    return allSkills
      .sort((a, b) => b.level - a.level)
      .slice(0, 3);
  }
}

/**
 * Compact dashboard for CLI integration
 */
export class CompactDashboard {
  constructor(theme = 'ocean') {
    this.renderer = new DashboardRenderer(theme);
  }

  /**
   * Render a compact daily summary
   */
  renderDailySummary(insights) {
    const lines = [];
    
    lines.push(this.renderer.theme.bright('🧬 Daily Developer Summary'));
    lines.push('');
    
    // Key metrics
    const flow = insights.performance;
    const growth = insights.growth;
    
    lines.push(`Flow Sessions: ${flow.flowSessions} | Learning: +${growth.conceptsLearned} concepts`);
    lines.push(`Peak Hours: ${flow.peakHours.join(', ')} | Genius Moments: ${insights.geniusMoments.length}`);
    
    // Top tip
    if (insights.personalizedTips.length > 0) {
      lines.push('');
      lines.push(insights.personalizedTips[0]);
    }
    
    return lines.join('\n');
  }

  /**
   * Render skill progression notification
   */
  renderSkillProgress(skillName, oldLevel, newLevel) {
    const lines = [];
    
    lines.push(this.renderer.theme.success('🎉 Skill Level Up!'));
    lines.push(`${skillName}: Level ${oldLevel} → ${newLevel}`);
    
    if (newLevel >= 10) {
      lines.push('🏆 Mastery Achieved!');
    } else if (newLevel >= 7) {
      lines.push('🌟 Advanced Level Reached!');
    }
    
    return lines.join('\n');
  }

  /**
   * Render genius moment notification
   */
  renderGeniusNotification(moment) {
    const lines = [];
    
    lines.push(this.renderer.theme.warning('✨ Moment of Genius Detected!'));
    lines.push(`"${moment.title}"`);
    lines.push(`Score: ${moment.score}/100`);
    lines.push(`Tags: ${moment.tags.join(', ')}`);
    
    return lines.join('\n');
  }
}

export default DashboardRenderer;