/**
 * Mock for https-proxy-agent
 *
 * https-proxy-agent is an ESM-only package that Jest cannot parse natively.
 * This mock provides a minimal CommonJS-compatible stub so that tests importing
 * modules that depend on https-proxy-agent can run without hitting ESM parse
 * errors.
 */

'use strict';

class HttpsProxyAgent {
  constructor(proxyUrl) {
    this.proxyUrl = proxyUrl;
  }

  // The agent is used by Node's https module; in tests we just pass through.
  // Returning undefined lets https.request fall back to direct connection.
}

module.exports = { HttpsProxyAgent };
module.exports.HttpsProxyAgent = HttpsProxyAgent;
