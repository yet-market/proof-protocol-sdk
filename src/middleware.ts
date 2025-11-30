/**
 * Express.js middleware for PROOF Protocol
 * Automatically records API calls to blockchain
 */

import { ProofClient } from './ProofClient';
import { ProofMiddlewareOptions, ProofReceipt, ProofResponse } from './types';

export class ProofMiddleware {
  private client: ProofClient;
  private options: ProofMiddlewareOptions;
  private batchQueue: Array<any> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(options: ProofMiddlewareOptions) {
    this.options = options;

    // Initialize ProofClient if not provided
    if (options.client) {
      this.client = options.client;
    } else if (options.privateKey) {
      this.client = new ProofClient({
        privateKey: options.privateKey,
        network: 'polygon' // Default to mainnet
      });
    } else {
      throw new Error('ProofMiddleware requires either a ProofClient instance or credentials');
    }

    // Start batch processing if configured
    if (options.batchInterval) {
      this.startBatchProcessing();
    }
  }

  /**
   * Express middleware function
   * @example
   * ```javascript
   * const app = express();
   * const proofMiddleware = new ProofMiddleware({
   *   privateKey: process.env.PRIVATE_KEY,
   *   patterns: ['/api/*']
   * });
   * app.use(proofMiddleware.express());
   * ```
   */
  express() {
    return async (req: any, res: any, next: any) => {
      // Check if this request should be recorded
      if (!this.shouldRecord(req.path)) {
        return next();
      }

      // Store original methods
      const originalSend = res.send;
      const originalJson = res.json;
      const startTime = Date.now();

      // Capture request data
      const requestData = {
        method: req.method,
        url: req.originalUrl || req.url,
        headers: req.headers,
        body: req.body,
        ip: req.ip,
        timestamp: startTime
      };

      // Override response methods to capture response data
      res.send = function(data: any) {
        res.locals.responseData = data;
        res.locals.responseTime = Date.now() - startTime;
        return originalSend.call(this, data);
      };

      res.json = function(data: any) {
        res.locals.responseData = data;
        res.locals.responseTime = Date.now() - startTime;
        return originalJson.call(this, data);
      };

      // Add recording after response is sent
      res.on('finish', async () => {
        try {
          const responseData = {
            status: res.statusCode,
            headers: res.getHeaders(),
            body: res.locals.responseData,
            duration: res.locals.responseTime || (Date.now() - startTime)
          };

          // Batch or immediate recording
          if (this.options.batchInterval) {
            this.addToBatch(requestData, responseData);
          } else {
            const receipt = await this.recordImmediately(requestData, responseData);
            console.log(`[PROOF] Recorded API call: ${receipt.recordId}`);
          }
        } catch (error) {
          console.error('[PROOF] Failed to record API call:', error);
          // Don't break the application if recording fails
        }
      });

      next();
    };
  }

  /**
   * Koa middleware function
   */
  koa() {
    return async (ctx: any, next: any) => {
      if (!this.shouldRecord(ctx.path)) {
        return next();
      }

      const startTime = Date.now();
      const requestData = {
        method: ctx.method,
        url: ctx.url,
        headers: ctx.headers,
        body: ctx.request.body,
        ip: ctx.ip,
        timestamp: startTime
      };

      await next();

      const responseData = {
        status: ctx.status,
        headers: ctx.response.headers,
        body: ctx.body,
        duration: Date.now() - startTime
      };

      try {
        if (this.options.batchInterval) {
          this.addToBatch(requestData, responseData);
        } else {
          const receipt = await this.recordImmediately(requestData, responseData);
          console.log(`[PROOF] Recorded API call: ${receipt.recordId}`);
        }
      } catch (error) {
        console.error('[PROOF] Failed to record API call:', error);
      }
    };
  }

  /**
   * Fastify plugin
   */
  fastify() {
    return async (fastify: any, opts: any) => {
      fastify.addHook('onResponse', async (request: any, reply: any) => {
        if (!this.shouldRecord(request.url)) {
          return;
        }

        const requestData = {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
          ip: request.ip,
          timestamp: request.startTime
        };

        const responseData = {
          status: reply.statusCode,
          headers: reply.getHeaders(),
          body: reply.payload,
          duration: Date.now() - request.startTime
        };

        try {
          if (this.options.batchInterval) {
            this.addToBatch(requestData, responseData);
          } else {
            const receipt = await this.recordImmediately(requestData, responseData);
            console.log(`[PROOF] Recorded API call: ${receipt.recordId}`);
          }
        } catch (error) {
          console.error('[PROOF] Failed to record API call:', error);
        }
      });
    };
  }

  // Private methods

  private shouldRecord(path: string): boolean {
    // Check exclude patterns first
    if (this.options.excludePatterns) {
      for (const pattern of this.options.excludePatterns) {
        if (this.matchPattern(path, pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (this.options.patterns) {
      for (const pattern of this.options.patterns) {
        if (this.matchPattern(path, pattern)) {
          return true;
        }
      }
      return false; // If patterns specified, only record matches
    }

    return true; // Record all if no patterns specified
  }

  private matchPattern(path: string, pattern: string): boolean {
    // Simple pattern matching (could be enhanced with proper glob matching)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(path);
    }
    return path === pattern || path.startsWith(pattern);
  }

  private async recordImmediately(requestData: any, responseData: any): Promise<ProofReceipt> {
    // Create a mock fetch response for the client
    const mockResponse = new Response(JSON.stringify(responseData.body), {
      status: responseData.status,
      headers: responseData.headers
    });

    // Create a response with URL property using Object.defineProperty for proper typing
    Object.defineProperty(mockResponse, 'url', {
      value: requestData.url,
      writable: false
    });

    // Use the client's record method
    const recordedResponse: ProofResponse = await this.client.record(
      Promise.resolve(mockResponse),
      {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body,
        metadata: {
          ip: requestData.ip,
          timestamp: requestData.timestamp,
          duration: responseData.duration
        }
      }
    );

    return recordedResponse.proof;
  }

  private addToBatch(requestData: any, responseData: any): void {
    this.batchQueue.push({
      request: requestData,
      response: responseData,
      metadata: {
        timestamp: Date.now()
      }
    });

    // Process batch if it reaches the size limit
    if (this.batchQueue.length >= (this.options.batchSize || 100)) {
      this.processBatch();
    }
  }

  private startBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, this.options.batchInterval || 60000); // Default 1 minute
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const receipt = await this.client.batchRecord(batch);
      console.log(`[PROOF] Batch recorded: ${batch.length} API calls, ID: ${receipt.recordId}`);
    } catch (error) {
      console.error('[PROOF] Failed to record batch:', error);
      // Could implement retry logic here
    }
  }

  /**
   * Static helper for simple Express integration
   * @example
   * ```javascript
   * app.use(ProofMiddleware.express({
   *   privateKey: process.env.PRIVATE_KEY,
   *   patterns: ['/api/*']
   * }));
   * ```
   */
  static express(options: ProofMiddlewareOptions) {
    const middleware = new ProofMiddleware(options);
    return middleware.express();
  }

  static koa(options: ProofMiddlewareOptions) {
    const middleware = new ProofMiddleware(options);
    return middleware.koa();
  }

  static fastify(options: ProofMiddlewareOptions) {
    const middleware = new ProofMiddleware(options);
    return middleware.fastify();
  }
}