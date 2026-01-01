/**
 * 🎨 Adaptive Interface System
 * 
 * Context-aware UI that adapts to developer flow state and cognitive load.
 * Progressive information disclosure with intelligent notification management.
 */

import chalk from 'chalk';

// Display modes based on context
export const DISPLAY_MODES = {
  MINIMAL: 'MINIMAL',           // Status dot only
  COMPACT: 'COMPACT',           // Brief status line
  CONTEXTUAL: 'CONTEXTUAL',     // Relevant information
  COMPREHENSIVE: 'COMPREHENSIVE', // Full details
  SILENT: 'SILENT'              // No display
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  URGENT: 'URGENT',             // Interrupt immediately
  IMPORTANT: 'IMPORTANT',       // Queue for next break
  INFORMATIONAL: 'INFORMATIONAL', // Silent log only
  AUTOMATED: 'AUTOMATED'        // Brief toast
};

// UI positions
export const UI_POSITIONS = {
  STATUS_BAR: 'STATUS_BAR',     // Single line at bottom
  SIDEBAR: 'SIDEBAR',           // Side panel
  OVERLAY: 'OVERLAY',           // Temporary overlay
  FULL: 'FULL',                 // Full interface
  TOAST: 'TOAST'                // Brief notification
};

/**
 * Context detector for adaptive UI
 */
class ContextDetector {
  constructor() {
    this.contextHistory = [];
    this.currentContext = null;
  }

  /**
   * Detect current development context
   */
  detectContext(signals = {}) {
    const context = {
      mode: this.inferMode(signals),
      cognitiveLoad: signals.cognitiveLoad || 'MEDIUM',
      flowState: signals.flowState || 'ENGAGED',
      activeTask: signals.activeTask || 'CODING',
      timeInCurrentFile: signals.timeInCurrentFile || 0,
      errorFrequency: signals.errorFrequency || 0,
      testRunning: signals.testRunning || false,
      debuggerActive: signals.debuggerActive || false,
      timestamp: Date.now()
    };

    this.currentContext = context;
    this.contextHistory.push(context);
    
    // Keep history bounded
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift();
    }

    return context;
  }

  /**
   * Infer display mode from signals
   */
  inferMode(signals) {
    // Deep work protection
    if (signals.flowState === 'DEEP_FLOW') {
      return DISPLAY_MODES.MINIMAL;
    }

    // Debugging context
    if (signals.debuggerActive || signals.errorFrequency > 3) {
      return DISPLAY_MODES.CONTEXTUAL;
    }

    // Code review context
    if (signals.activeTask === 'CODE_REVIEW') {
      return DISPLAY_MODES.COMPREHENSIVE;
    }

    // High cognitive load
    if (signals.cognitiveLoad === 'HIGH') {
      return DISPLAY_MODES.COMPACT;
    }

    // Default
    return DISPLAY_MODES.CONTEXTUAL;
  }

  /**
   * Get context stability (how consistent context has been)
   */
  getContextStability() {
    const recent = this.contextHistory.slice(-10);
    if (recent.length < 2) return 1;

    const modes = recent.map(c => c.mode);
    const mostCommon = modes.sort((a, b) =>
      modes.filter(v => v === a).length - modes.filter(v => v === b).length
    ).pop();

    return modes.filter(m => m === mostCommon).length / modes.length;
  }
}

/**
 * Notification manager with priority-based queuing
 */
class NotificationManager {
  constructor() {
    this.queue = [];
    this.displayedNotifications = [];
    this.silenceUntil = 0;
    this.maxQueueSize = 50;
  }

  /**
   * Add notification to queue
   */
  notify(notification) {
    const enrichedNotification = {
      id: this.generateId(),
      timestamp: Date.now(),
      priority: notification.priority || NOTIFICATION_PRIORITIES.INFORMATIONAL,
      title: notification.title,
      message: notification.message,
      actions: notification.actions || [],
      category: notification.category || 'general',
      ttl: notification.ttl || 30000, // 30 seconds default
      ...notification
    };

    // Check if we should show immediately
    if (this.shouldShowImmediately(enrichedNotification)) {
      this.displayNotification(enrichedNotification);
    } else {
      this.queueNotification(enrichedNotification);
    }

    return enrichedNotification.id;
  }

  /**
   * Determine if notification should interrupt immediately
   */
  shouldShowImmediately(notification) {
    // Respect silence period
    if (Date.now() < this.silenceUntil) {
      return notification.priority === NOTIFICATION_PRIORITIES.URGENT;
    }

    // Priority-based logic
    switch (notification.priority) {
      case NOTIFICATION_PRIORITIES.URGENT:
        return true;
      case NOTIFICATION_PRIORITIES.IMPORTANT:
        return this.isGoodTimeToInterrupt();
      case NOTIFICATION_PRIORITIES.AUTOMATED:
        return true; // Brief toast
      default:
        return false; // Queue for later
    }
  }

  /**
   * Check if it's a good time to interrupt
   */
  isGoodTimeToInterrupt() {
    // Simple heuristic - could be enhanced with more signals
    const recentNotifications = this.displayedNotifications.filter(
      n => Date.now() - n.displayedAt < 60000 // Last minute
    );
    
    return recentNotifications.length < 2;
  }

  /**
   * Queue notification for later display
   */
  queueNotification(notification) {
    this.queue.push(notification);
    
    // Sort by priority
    this.queue.sort((a, b) => {
      const priorities = {
        [NOTIFICATION_PRIORITIES.URGENT]: 4,
        [NOTIFICATION_PRIORITIES.IMPORTANT]: 3,
        [NOTIFICATION_PRIORITIES.AUTOMATED]: 2,
        [NOTIFICATION_PRIORITIES.INFORMATIONAL]: 1
      };
      return priorities[b.priority] - priorities[a.priority];
    });

    // Keep queue bounded
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.slice(0, this.maxQueueSize);
    }
  }

  /**
   * Display notification immediately
   */
  displayNotification(notification) {
    notification.displayedAt = Date.now();
    this.displayedNotifications.push(notification);

    // Clean up old displayed notifications
    this.displayedNotifications = this.displayedNotifications.filter(
      n => Date.now() - n.displayedAt < 300000 // Keep for 5 minutes
    );

    return notification;
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(limit = 5) {
    return this.queue.slice(0, limit);
  }

  /**
   * Clear notification from queue
   */
  clearNotification(id) {
    this.queue = this.queue.filter(n => n.id !== id);
  }

  /**
   * Silence notifications for duration
   */
  silence(durationMs) {
    this.silenceUntil = Date.now() + durationMs;
  }

  /**
   * Generate unique notification ID
   */
  generateId() {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Progressive information disclosure renderer
 */
class ProgressiveRenderer {
  constructor() {
    this.terminalWidth = process.stdout.columns || 80;
    this.supportsUnicode = this.checkUnicodeSupport();
    this.supportsColor = this.checkColorSupport();
  }

  /**
   * Render based on display mode
   */
  render(data, mode = DISPLAY_MODES.CONTEXTUAL) {
    switch (mode) {
      case DISPLAY_MODES.MINIMAL:
        return this.renderMinimal(data);
      case DISPLAY_MODES.COMPACT:
        return this.renderCompact(data);
      case DISPLAY_MODES.CONTEXTUAL:
        return this.renderContextual(data);
      case DISPLAY_MODES.COMPREHENSIVE:
        return this.renderComprehensive(data);
      case DISPLAY_MODES.SILENT:
        return '';
      default:
        return this.renderContextual(data);
    }
  }

  /**
   * Minimal mode - just a status indicator
   */
  renderMinimal(data) {
    const status = this.getStatusIndicator(data);
    const hint = chalk.dim(' (⌘L for details)');
    return `[Letta: ${status}]${hint}`;
  }

  /**
   * Compact mode - single line status
   */
  renderCompact(data) {
    const status = this.getStatusIndicator(data);
    const issues = data.issues || 0;
    const fixed = data.fixed || 0;
    
    return `[Letta: ${status}] ${issues} issues | ${fixed} fixed | ${data.flowState || 'Working'}`;
  }

  /**
   * Contextual mode - relevant information
   */
  renderContextual(data) {
    const lines = [];
    const width = Math.min(this.terminalWidth, 60);
    
    // Header
    lines.push(this.createBox('Letta Status', width));
    
    // Project info
    if (data.project) {
      lines.push(`Project: ${chalk.cyan(data.project.name)} ${chalk.dim(`(v${data.project.version})`)}`);
    }
    
    // Status summary
    const issues = data.issues || 0;
    const fixed = data.fixed || 0;
    const status = issues > 0 ? chalk.yellow(`${issues} ⚠️`) : chalk.green('✅');
    lines.push(`Issues: ${status} | Fixed: ${chalk.green(`${fixed} ✅`)}`);
    
    // Flow state
    if (data.flowState) {
      const flowIcon = this.getFlowIcon(data.flowState);
      lines.push(`Flow: ${flowIcon} ${data.flowState}`);
    }
    
    // Top issues (if any)
    if (data.topIssues && data.topIssues.length > 0) {
      lines.push('');
      data.topIssues.slice(0, 3).forEach((issue, index) => {
        const confidence = issue.confidence ? ` (${issue.confidence}%)` : '';
        const time = issue.estimatedTime ? ` | ${issue.estimatedTime}` : '';
        lines.push(`[${index + 1}] ${issue.title}${confidence}${time}`);
        
        if (issue.actions) {
          const actions = issue.actions.map(a => `[${a.key} ${a.label}]`).join(' ');
          lines.push(`    ${chalk.dim(actions)}`);
        }
      });
    }
    
    lines.push(this.createSeparator(width));
    
    return lines.join('\n');
  }

  /**
   * Comprehensive mode - full details
   */
  renderComprehensive(data) {
    const lines = [];
    const width = Math.min(this.terminalWidth, 80);
    
    // Header with full project info
    lines.push(this.createBox(`Letta - ${data.project?.name || 'Project'}`, width));
    
    if (data.project) {
      lines.push(`Version: ${data.project.version} | Files: ${data.project.fileCount || 0}`);
      lines.push(`Dependencies: ${data.project.dependencies || 0} | Tests: ${data.project.testCount || 0}`);
    }
    
    lines.push('');
    
    // Detailed status
    const issues = data.issues || 0;
    const fixed = data.fixed || 0;
    const prevented = data.prevented || 0;
    
    lines.push('📊 Analysis Summary:');
    lines.push(`   Issues Found: ${issues}`);
    lines.push(`   Auto-Fixed: ${fixed}`);
    lines.push(`   Prevented: ${prevented}`);
    
    // Flow and cognitive state
    if (data.flowState || data.cognitiveLoad) {
      lines.push('');
      lines.push('🧠 Developer State:');
      if (data.flowState) {
        lines.push(`   Flow: ${this.getFlowIcon(data.flowState)} ${data.flowState}`);
      }
      if (data.cognitiveLoad) {
        lines.push(`   Cognitive Load: ${this.getCognitiveLoadIcon(data.cognitiveLoad)} ${data.cognitiveLoad}`);
      }
    }
    
    // All issues
    if (data.allIssues && data.allIssues.length > 0) {
      lines.push('');
      lines.push('🔍 All Issues:');
      data.allIssues.forEach((issue, index) => {
        const severity = this.getSeverityIcon(issue.severity);
        const confidence = issue.confidence ? ` (${issue.confidence}%)` : '';
        lines.push(`   ${severity} ${issue.title}${confidence}`);
        lines.push(`      File: ${issue.file}:${issue.line}`);
        if (issue.suggestion) {
          lines.push(`      💡 ${issue.suggestion}`);
        }
      });
    }
    
    // Recent activity
    if (data.recentActivity && data.recentActivity.length > 0) {
      lines.push('');
      lines.push('📈 Recent Activity:');
      data.recentActivity.slice(0, 5).forEach(activity => {
        const time = new Date(activity.timestamp).toLocaleTimeString();
        lines.push(`   ${time} - ${activity.description}`);
      });
    }
    
    lines.push(this.createSeparator(width));
    
    return lines.join('\n');
  }

  /**
   * Get status indicator based on data
   */
  getStatusIndicator(data) {
    const issues = data.issues || 0;
    const criticalIssues = data.criticalIssues || 0;
    
    if (criticalIssues > 0) {
      return chalk.red('●'); // Red for critical
    } else if (issues > 0) {
      return chalk.yellow('●'); // Yellow for warnings
    } else {
      return chalk.green('●'); // Green for all good
    }
  }

  /**
   * Get flow state icon
   */
  getFlowIcon(flowState) {
    const icons = {
      'DEEP_FLOW': '🌊',
      'FLOW': '💧',
      'ENGAGED': '⚡',
      'DISTRACTED': '💭',
      'STRUGGLING': '🆘'
    };
    return icons[flowState] || '❓';
  }

  /**
   * Get cognitive load icon
   */
  getCognitiveLoadIcon(cognitiveLoad) {
    const icons = {
      'LOW': '🟢',
      'MEDIUM': '🟡',
      'HIGH': '🔴'
    };
    return icons[cognitiveLoad] || '⚪';
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity) {
    const icons = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢',
      'info': '🔵'
    };
    return icons[severity] || '⚪';
  }

  /**
   * Create a box with title
   */
  createBox(title, width = 50) {
    const padding = Math.max(0, width - title.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    
    if (this.supportsUnicode) {
      return `╔${'═'.repeat(leftPad)} ${title} ${'═'.repeat(rightPad)}╗`;
    } else {
      return `+${'-'.repeat(leftPad)} ${title} ${'-'.repeat(rightPad)}+`;
    }
  }

  /**
   * Create separator line
   */
  createSeparator(width = 50) {
    if (this.supportsUnicode) {
      return `╚${'═'.repeat(width - 2)}╝`;
    } else {
      return `+${'-'.repeat(width - 2)}+`;
    }
  }

  /**
   * Check if terminal supports Unicode
   */
  checkUnicodeSupport() {
    return process.env.TERM !== 'dumb' && 
           process.platform !== 'win32' ||
           process.env.CI ||
           process.env.TERM === 'xterm-256color';
  }

  /**
   * Check if terminal supports color
   */
  checkColorSupport() {
    return chalk.supportsColor !== false;
  }
}

/**
 * Main Adaptive Interface System
 */
export class AdaptiveInterface {
  constructor(options = {}) {
    this.contextDetector = new ContextDetector();
    this.notificationManager = new NotificationManager();
    this.renderer = new ProgressiveRenderer();
    this.currentMode = DISPLAY_MODES.CONTEXTUAL;
    this.refreshInterval = options.refreshInterval || 5000;
    this.isActive = false;
  }

  /**
   * Start the adaptive interface
   */
  start() {
    this.isActive = true;
    console.log('🎨 Adaptive interface started');
  }

  /**
   * Stop the adaptive interface
   */
  stop() {
    this.isActive = false;
  }

  /**
   * Update interface with new data
   */
  update(data, signals = {}) {
    if (!this.isActive) return;

    // Detect context
    const context = this.contextDetector.detectContext(signals);
    
    // Determine display mode
    this.currentMode = context.mode;
    
    // Render interface
    const rendered = this.renderer.render(data, this.currentMode);
    
    // Handle notifications
    this.processNotifications(data.notifications || []);
    
    return {
      rendered,
      context,
      mode: this.currentMode,
      notifications: this.notificationManager.getPendingNotifications()
    };
  }

  /**
   * Process incoming notifications
   */
  processNotifications(notifications) {
    for (const notification of notifications) {
      this.notificationManager.notify(notification);
    }
  }

  /**
   * Show notification
   */
  notify(notification) {
    return this.notificationManager.notify(notification);
  }

  /**
   * Silence notifications for duration
   */
  silence(durationMs) {
    this.notificationManager.silence(durationMs);
    console.log(`🔇 Notifications silenced for ${Math.round(durationMs / 1000 / 60)} minutes`);
  }

  /**
   * Force display mode
   */
  setDisplayMode(mode) {
    if (Object.values(DISPLAY_MODES).includes(mode)) {
      this.currentMode = mode;
      console.log(`🎨 Display mode set to: ${mode}`);
    } else {
      throw new Error('Invalid display mode');
    }
  }

  /**
   * Get interface statistics
   */
  getStatistics() {
    return {
      currentMode: this.currentMode,
      contextStability: this.contextDetector.getContextStability(),
      pendingNotifications: this.notificationManager.queue.length,
      displayedNotifications: this.notificationManager.displayedNotifications.length,
      terminalCapabilities: {
        width: this.renderer.terminalWidth,
        supportsUnicode: this.renderer.supportsUnicode,
        supportsColor: this.renderer.supportsColor
      }
    };
  }

  /**
   * Create notification with smart priority
   */
  createSmartNotification(title, message, options = {}) {
    // Auto-determine priority based on content
    let priority = NOTIFICATION_PRIORITIES.INFORMATIONAL;
    
    if (message.includes('critical') || message.includes('security')) {
      priority = NOTIFICATION_PRIORITIES.URGENT;
    } else if (message.includes('error') || message.includes('failed')) {
      priority = NOTIFICATION_PRIORITIES.IMPORTANT;
    } else if (message.includes('fixed') || message.includes('completed')) {
      priority = NOTIFICATION_PRIORITIES.AUTOMATED;
    }

    return this.notify({
      title,
      message,
      priority,
      ...options
    });
  }
}

export default AdaptiveInterface;