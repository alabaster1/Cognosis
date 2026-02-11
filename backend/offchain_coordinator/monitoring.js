/**
 * Monitoring and Alerting for Midnight Contract Events
 * Tracks blockchain events, errors, and system health
 */

class MonitoringService {
  constructor() {
    this.metrics = {
      commits: { total: 0, successful: 0, failed: 0 },
      reveals: { total: 0, successful: 0, failed: 0 },
      ipfsUploads: { total: 0, successful: 0, failed: 0 },
      errors: [],
      uptime: Date.now(),
    };

    this.thresholds = {
      errorRate: 0.1, // 10% error rate triggers alert
      maxErrors: 100,
      responseTime: 5000, // 5 seconds
    };

    this.alerts = [];
  }

  /**
   * Record successful commit
   */
  recordCommit(success = true, responseTime = 0) {
    this.metrics.commits.total++;
    if (success) {
      this.metrics.commits.successful++;
    } else {
      this.metrics.commits.failed++;
      this.checkErrorThreshold('commits');
    }

    if (responseTime > this.thresholds.responseTime) {
      this.createAlert('SLOW_COMMIT', `Commit took ${responseTime}ms`);
    }
  }

  /**
   * Record successful reveal
   */
  recordReveal(success = true, responseTime = 0) {
    this.metrics.reveals.total++;
    if (success) {
      this.metrics.reveals.successful++;
    } else {
      this.metrics.reveals.failed++;
      this.checkErrorThreshold('reveals');
    }

    if (responseTime > this.thresholds.responseTime) {
      this.createAlert('SLOW_REVEAL', `Reveal took ${responseTime}ms`);
    }
  }

  /**
   * Record IPFS upload
   */
  recordIPFSUpload(success = true, size = 0) {
    this.metrics.ipfsUploads.total++;
    if (success) {
      this.metrics.ipfsUploads.successful++;
    } else {
      this.metrics.ipfsUploads.failed++;
      this.checkErrorThreshold('ipfsUploads');
    }
  }

  /**
   * Record error
   */
  recordError(error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context,
    };

    this.metrics.errors.push(errorRecord);

    // Keep only last N errors
    if (this.metrics.errors.length > this.thresholds.maxErrors) {
      this.metrics.errors.shift();
    }

    console.error('[MONITOR] Error recorded:', errorRecord);

    // Create alert for critical errors
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      this.createAlert('NETWORK_ERROR', error.message);
    }
  }

  /**
   * Check error rate threshold
   */
  checkErrorThreshold(operation) {
    const metric = this.metrics[operation];
    if (metric.total === 0) return;

    const errorRate = metric.failed / metric.total;

    if (errorRate > this.thresholds.errorRate) {
      this.createAlert(
        'HIGH_ERROR_RATE',
        `${operation} error rate: ${(errorRate * 100).toFixed(1)}%`
      );
    }
  }

  /**
   * Create alert
   */
  createAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    console.warn(`[ALERT] ${type}: ${message}`);

    // TODO: Send to external alerting system (PagerDuty, Slack, etc.)
    // this.sendToAlertingService(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const uptimeHours = ((Date.now() - this.metrics.uptime) / (1000 * 60 * 60)).toFixed(2);

    return {
      ...this.metrics,
      uptimeHours,
      errorRates: {
        commits: this.metrics.commits.total > 0
          ? (this.metrics.commits.failed / this.metrics.commits.total).toFixed(3)
          : 0,
        reveals: this.metrics.reveals.total > 0
          ? (this.metrics.reveals.failed / this.metrics.reveals.total).toFixed(3)
          : 0,
        ipfsUploads: this.metrics.ipfsUploads.total > 0
          ? (this.metrics.ipfsUploads.failed / this.metrics.ipfsUploads.total).toFixed(3)
          : 0,
      },
      recentErrors: this.metrics.errors.slice(-10),
      activeAlerts: this.alerts.filter(a => !a.acknowledged),
    };
  }

  /**
   * Get health status
   */
  getHealth() {
    const metrics = this.getMetrics();
    const hasActiveAlerts = metrics.activeAlerts.length > 0;
    const highErrorRate = Object.values(metrics.errorRates).some(rate => rate > this.thresholds.errorRate);

    let status = 'healthy';
    let issues = [];

    if (highErrorRate) {
      status = 'degraded';
      issues.push('High error rate detected');
    }

    if (hasActiveAlerts) {
      status = 'degraded';
      issues.push(`${metrics.activeAlerts.length} active alerts`);
    }

    if (metrics.recentErrors.length > 5) {
      status = 'unhealthy';
      issues.push('Multiple recent errors');
    }

    return {
      status,
      issues,
      uptime: metrics.uptimeHours + ' hours',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertIndex) {
    if (this.alerts[alertIndex]) {
      this.alerts[alertIndex].acknowledged = true;
    }
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      commits: { total: 0, successful: 0, failed: 0 },
      reveals: { total: 0, successful: 0, failed: 0 },
      ipfsUploads: { total: 0, successful: 0, failed: 0 },
      errors: [],
      uptime: Date.now(),
    };
    this.alerts = [];
  }
}

// Export singleton
module.exports = new MonitoringService();
