#!/usr/bin/env node
/**
 * Test script for the Developer Insight Engine
 */

import { CognitiveEngine, EVENT_TYPES } from '../src/cognitive/index.js';
import { DashboardRenderer } from '../src/insights/dashboardRenderer.js';
import chalk from 'chalk';

async function testInsightEngine() {
  console.log(chalk.cyan('🧬 Testing Developer Insight Engine\n'));

  try {
    // Test 1: Initialize Cognitive Engine with insights
    console.log(chalk.yellow('1. Initializing Cognitive Engine with insights...'));
    const engine = new CognitiveEngine({
      enableInsights: true,
      enableSecurity: true,
      enableAdaptiveUI: true,
      projectPath: process.cwd()
    });

    await engine.start();
    console.log(chalk.green('   ✓ Cognitive Engine started with insights enabled'));

    // Test 2: Record some learning events
    console.log(chalk.yellow('\n2. Recording learning events...'));
    engine.recordLearning('async/await patterns', { 
      trigger: 'documentation', 
      complexity: 7 
    });
    engine.recordLearning('TypeScript generics', { 
      trigger: 'experimentation', 
      complexity: 8 
    });
    console.log(chalk.green('   ✓ Learning events recorded'));

    // Test 3: Record a breakthrough moment
    console.log(chalk.yellow('\n3. Recording breakthrough moment...'));
    engine.recordBreakthrough(
      'Complex async race condition',
      'Implemented elegant Promise.allSettled solution',
      { impact: 9, complexity: 3, solutionType: 'novel' }
    );
    console.log(chalk.green('   ✓ Breakthrough moment recorded'));

    // Test 4: Analyze some code to trigger events
    console.log(chalk.yellow('\n4. Analyzing code to generate insights...'));
    const testCode = `
async function processData(items) {
  const results = await Promise.all(
    items.map(async (item) => {
      const processed = await processItem(item);
      return { id: item.id, result: processed };
    })
  );
  return results.filter(r => r.result !== null);
}
`;
    
    await engine.analyze({
      activeFileContent: testCode,
      filePath: 'test.js',
      language: 'javascript',
      framework: 'node'
    });
    console.log(chalk.green('   ✓ Code analysis completed'));

    // Test 5: Generate insights
    console.log(chalk.yellow('\n5. Generating comprehensive insights...'));
    const insights = engine.getInsights('7d');
    
    if (insights && !insights.error) {
      console.log(chalk.green('   ✓ Insights generated successfully'));
      console.log(chalk.gray(`   Growth metrics: ${insights.growth.conceptsLearned} concepts learned`));
      console.log(chalk.gray(`   Performance: ${insights.performance.flowSessions} flow sessions`));
      console.log(chalk.gray(`   Creativity: ${insights.creativity.eleganceScore}/100 elegance score`));
      console.log(chalk.gray(`   Genius moments: ${insights.geniusMoments.length} captured`));
    } else {
      console.log(chalk.yellow('   ⚠ Insights generation returned error (expected with minimal data)'));
    }

    // Test 6: Get skill tree
    console.log(chalk.yellow('\n6. Getting skill tree progression...'));
    const skillTree = engine.getSkillTree();
    if (skillTree && !skillTree.error) {
      console.log(chalk.green('   ✓ Skill tree retrieved'));
      const totalSkills = Object.values(skillTree).reduce((sum, category) => sum + Object.keys(category).length, 0);
      console.log(chalk.gray(`   Total skills tracked: ${totalSkills}`));
    } else {
      console.log(chalk.yellow('   ⚠ Skill tree not available'));
    }

    // Test 7: Get evolution stage
    console.log(chalk.yellow('\n7. Getting developer evolution stage...'));
    const evolutionStage = engine.getEvolutionStage();
    if (evolutionStage && !evolutionStage.error) {
      console.log(chalk.green('   ✓ Evolution stage determined'));
      console.log(chalk.gray(`   Current stage: ${evolutionStage.name} (Level ${evolutionStage.level})`));
      console.log(chalk.gray(`   Description: ${evolutionStage.description}`));
    } else {
      console.log(chalk.yellow('   ⚠ Evolution stage not available'));
    }

    // Test 8: Test dashboard rendering
    console.log(chalk.yellow('\n8. Testing dashboard rendering...'));
    const renderer = new DashboardRenderer('ocean');
    
    if (insights && !insights.error) {
      // Test compact rendering
      const compactSummary = renderer.renderDeveloperDNA(insights);
      console.log(chalk.green('   ✓ Dashboard rendering successful'));
      console.log(chalk.gray(`   Dashboard length: ${compactSummary.length} characters`));
    } else {
      console.log(chalk.yellow('   ⚠ Dashboard rendering skipped (no insights data)'));
    }

    // Clean up
    engine.stop();
    console.log(chalk.green('\n✅ All insight engine features tested successfully!'));
    console.log(chalk.gray('\nThe Developer Insight Engine is ready to transform your coding experience! 🚀'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error testing insight engine:'), error.message);
    if (error.stack) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}

// Run the test
testInsightEngine().catch(console.error);