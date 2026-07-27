#!/usr/bin/env node

/**
 * 性能基准测试脚本
 * 用于在测试环境中运行负载测试并收集性能指标
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置
const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
  grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3001',
  testDuration: '2m',
  virtualUsers: 50,
  outputDir: './benchmark-results',
  timestamp: new Date().toISOString().replace(/[:.]/g, '-')
};

// 创建输出目录
const outputDir = path.join(CONFIG.outputDir, CONFIG.timestamp);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 性能基准类
class PerformanceBenchmark {
  constructor(config) {
    this.config = config;
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'test',
      config: config,
      tests: [],
      metrics: {}
    };
  }

  /**
   * 运行负载测试
   */
  async runLoadTest() {
    console.log('🚀 开始负载测试...');

    const testConfig = {
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: this.config.virtualUsers },
        { duration: '30s', target: 0 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01']
      }
    };

    const testFile = path.join(outputDir, 'load-test-config.json');
    fs.writeFileSync(testFile, JSON.stringify(testConfig, null, 2));

    try {
      // 使用k6运行负载测试
      const k6Command = `k6 run --out json=${path.join(outputDir, 'load-test-results.json')} ${path.join(__dirname, 'load-test/basic.js')}`;

      console.log(`执行命令: ${k6Command}`);
      const output = execSync(k6Command, {
        stdio: 'pipe',
        env: { ...process.env, BASE_URL: this.config.backendUrl }
      }).toString();

      console.log('✅ 负载测试完成');
      this.results.tests.push({
        name: 'load-test',
        status: 'completed',
        output: output.substring(0, 1000) // 截断输出
      });

      // 解析k6结果
      const resultsFile = path.join(outputDir, 'load-test-results.json');
      if (fs.existsSync(resultsFile)) {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        this.results.metrics.loadTest = this.extractK6Metrics(results);
      }

    } catch (error) {
      console.error('❌ 负载测试失败:', error.message);
      this.results.tests.push({
        name: 'load-test',
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * 从k6结果中提取关键指标
   */
  extractK6Metrics(k6Results) {
    const metrics = {};

    if (k6Results.metrics) {
      const m = k6Results.metrics;

      metrics.http_req_duration = {
        avg: m.http_req_duration?.values?.avg || 0,
        p95: m.http_req_duration?.values?.['p(95)'] || 0,
        p99: m.http_req_duration?.values?.['p(99)'] || 0
      };

      metrics.http_req_failed = m.http_req_failed?.values?.rate || 0;
      metrics.http_reqs = m.http_reqs?.values?.rate || 0;
      metrics.iterations = m.iterations?.values?.count || 0;
    }

    return metrics;
  }

  /**
   * 从Prometheus查询性能指标
   */
  async queryPrometheusMetrics() {
    console.log('📊 查询Prometheus指标...');

    const queries = {
      request_duration: 'rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])',
      request_rate: 'rate(http_requests_total[5m])',
      error_rate: 'rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])',
      memory_usage: 'process_resident_memory_bytes',
      cpu_usage: 'rate(process_cpu_seconds_total[5m]) * 100'
    };

    this.results.metrics.prometheus = {};

    for (const [name, query] of Object.entries(queries)) {
      try {
        const response = await axios.get(`${this.config.prometheusUrl}/api/v1/query`, {
          params: { query }
        });

        if (response.data.status === 'success' && response.data.data.result.length > 0) {
          this.results.metrics.prometheus[name] = response.data.data.result[0].value[1];
        }
      } catch (error) {
        console.warn(`⚠️  无法查询指标 ${name}:`, error.message);
      }
    }

    console.log('✅ Prometheus指标查询完成');
  }

  /**
   * 运行健康检查
   */
  async runHealthChecks() {
    console.log('🏥 运行健康检查...');

    const endpoints = [
      { name: 'backend', url: `${this.config.backendUrl}/health` },
      { name: 'prometheus', url: `${this.config.prometheusUrl}/-/healthy` },
      { name: 'grafana', url: `${this.config.grafanaUrl}/api/health` }
    ];

    this.results.healthChecks = [];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        const duration = Date.now() - start;

        this.results.healthChecks.push({
          service: endpoint.name,
          status: 'healthy',
          responseTime: duration,
          statusCode: response.status
        });

        console.log(`✅ ${endpoint.name}: ${duration}ms`);
      } catch (error) {
        this.results.healthChecks.push({
          service: endpoint.name,
          status: 'unhealthy',
          error: error.message
        });

        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
  }

  /**
   * 生成基准测试报告
   */
  generateReport() {
    console.log('📄 生成基准测试报告...');

    const reportFile = path.join(outputDir, 'benchmark-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    // 生成简化的Markdown报告
    const markdownReport = this.generateMarkdownReport();
    const markdownFile = path.join(outputDir, 'README.md');
    fs.writeFileSync(markdownFile, markdownReport);

    console.log(`📊 报告已保存至: ${outputDir}`);

    // 打印摘要
    console.log('\n=== 性能基准测试摘要 ===');
    if (this.results.metrics.loadTest) {
      const lt = this.results.metrics.loadTest;
      console.log(`平均响应时间: ${lt.http_req_duration?.avg?.toFixed(2)}ms`);
      console.log(`P95响应时间: ${lt.http_req_duration?.p95?.toFixed(2)}ms`);
      console.log(`请求成功率: ${((1 - (lt.http_req_failed || 0)) * 100).toFixed(2)}%`);
    }
  }

  /**
   * 生成Markdown格式报告
   */
  generateMarkdownReport() {
    const { metrics, healthChecks, timestamp } = this.results;

    return `# 性能基准测试报告

## 测试信息
- **测试时间**: ${timestamp}
- **测试环境**: ${this.config.environment || 'test'}
- **后端地址**: ${this.config.backendUrl}

## 负载测试结果
${
  metrics.loadTest
    ? `
| 指标 | 值 |
|------|-----|
| 平均响应时间 | ${metrics.loadTest.http_req_duration?.avg?.toFixed(2) || 'N/A'}ms |
| P95响应时间 | ${metrics.loadTest.http_req_duration?.p95?.toFixed(2) || 'N/A'}ms |
| P99响应时间 | ${metrics.loadTest.http_req_duration?.p99?.toFixed(2) || 'N/A'}ms |
| 请求成功率 | ${((1 - (metrics.loadTest.http_req_failed || 0)) * 100).toFixed(2)}% |
| 请求速率 | ${metrics.loadTest.http_reqs?.toFixed(2) || 'N/A'} req/s |
| 总迭代次数 | ${metrics.loadTest.iterations || 'N/A'} |
`
    : '无负载测试数据'
}

## 系统指标
${
  metrics.prometheus
    ? `
| 指标 | 值 |
|------|-----|
| 请求延迟 | ${metrics.prometheus.request_duration || 'N/A'}s |
| 请求速率 | ${metrics.prometheus.request_rate || 'N/A'} req/s |
| 错误率 | ${(metrics.prometheus.error_rate * 100 || 0).toFixed(2)}% |
| 内存使用 | ${(metrics.prometheus.memory_usage / 1024 / 1024 || 0).toFixed(2)} MB |
| CPU使用率 | ${(metrics.prometheus.cpu_usage || 0).toFixed(2)}% |
`
    : '无Prometheus数据'
}

## 健康检查
${
  healthChecks
    ? healthChecks.map(hc =>
        `- **${hc.service}**: ${hc.status} ${hc.responseTime ? `(${hc.responseTime}ms)` : ''}`
      ).join('\n')
    : '无健康检查数据'
}

## 建议
1. 根据测试结果调整服务器资源配置
2. 优化高延迟的API端点
3. 考虑实施缓存策略
4. 监控错误率并设置告警阈值

## 后续步骤
1. 定期运行基准测试以跟踪性能变化
2. 比较不同版本的性能差异
3. 根据业务增长调整负载测试规模
`;
  }

  /**
   * 运行完整的基准测试套件
   */
  async run() {
    console.log('🎯 开始性能基准测试套件');
    console.log(`输出目录: ${outputDir}`);

    await this.runHealthChecks();
    await this.runLoadTest();
    await this.queryPrometheusMetrics();
    this.generateReport();

    console.log('🎉 性能基准测试完成');
  }
}

// 主执行函数
async function main() {
  const benchmark = new PerformanceBenchmark(CONFIG);

  try {
    await benchmark.run();
  } catch (error) {
    console.error('💥 基准测试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = PerformanceBenchmark;