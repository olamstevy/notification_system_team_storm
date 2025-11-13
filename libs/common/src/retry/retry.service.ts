import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  max_attempts: number;
  initial_delay: number; // milliseconds
  max_delay: number; // milliseconds
  backoff_multiplier: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  private readonly defaultOptions: RetryOptions = {
    max_attempts: 5,
    initial_delay: 1000, // 1 second
    max_delay: 60000, // 1 minute
    backoff_multiplier: 2,
    jitter: true,
  };

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    key: string,
    options?: Partial<RetryOptions>,
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= opts.max_attempts; attempt++) {
      try {
        this.logger.log(`${key}: Attempt ${attempt}/${opts.max_attempts}`);
        const result = await fn();
        
        if (attempt > 1) {
          this.logger.log(`${key}: Succeeded on attempt ${attempt}`);
        }
        
        return {
          success: true,
          result,
          attempts: attempt,
        };
      } catch (error) {
        lastError = error;
        this.logger.error(
          `${key}: Failed on attempt ${attempt}/${opts.max_attempts}`,
          error.message,
        );

        if (attempt < opts.max_attempts) {
          const delay = this.calculateDelay(attempt, opts);
          this.logger.log(`${key}: Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      `${key}: All ${opts.max_attempts} attempts failed`,
      lastError,
    );

    return {
      success: false,
      error: lastError,
      attempts: opts.max_attempts,
    };
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    // Exponential backoff: initial_delay * (multiplier ^ (attempt - 1))
    let delay = options.initial_delay * Math.pow(options.backoff_multiplier, attempt - 1);
    
    // Cap at max_delay
    delay = Math.min(delay, options.max_delay);
    
    // Add jitter to prevent thundering herd
    if (options.jitter) {
      const jitterAmount = delay * 0.25; // 25% jitter
      delay = delay - jitterAmount + Math.random() * jitterAmount * 2;
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP errors (5xx are retryable, 4xx are not)
    if (error.response?.status) {
      return error.response.status >= 500;
    }

    // Default: retry
    return true;
  }
}
