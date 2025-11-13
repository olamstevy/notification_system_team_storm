import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitBreakerState> = new Map();

  private readonly defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 30000, // 30 seconds
  };

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(key, options);
    
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailureTime < circuit.options.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      }
      
      // Transition to HALF_OPEN
      circuit.state = CircuitState.HALF_OPEN;
      this.logger.log(`Circuit ${key} transitioning to HALF_OPEN`);
    }

    try {
      const result = await Promise.race([
        fn(),
        this.timeout(circuit.options.timeout),
      ]);

      this.onSuccess(circuit, key);
      return result as T;
    } catch (error) {
      this.onFailure(circuit, key, error);
      throw error;
    }
  }

  private getOrCreateCircuit(
    key: string,
    options?: Partial<CircuitBreakerOptions>,
  ): CircuitBreakerState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        options: { ...this.defaultOptions, ...options },
      });
    }
    return this.circuits.get(key)!;
  }

  private onSuccess(circuit: CircuitBreakerState, key: string): void {
    circuit.failureCount = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;
      
      if (circuit.successCount >= circuit.options.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.successCount = 0;
        this.logger.log(`Circuit ${key} is now CLOSED`);
      }
    }
  }

  private onFailure(
    circuit: CircuitBreakerState,
    key: string,
    error: any,
  ): void {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    circuit.successCount = 0;

    this.logger.error(
      `Circuit ${key} failure ${circuit.failureCount}/${circuit.options.failureThreshold}`,
      error,
    );

    if (circuit.failureCount >= circuit.options.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      this.logger.warn(`Circuit ${key} is now OPEN`);
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Circuit breaker timeout')), ms),
    );
  }

  getCircuitState(key: string): CircuitState | undefined {
    return this.circuits.get(key)?.state;
  }

  resetCircuit(key: string): void {
    const circuit = this.circuits.get(key);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      this.logger.log(`Circuit ${key} manually reset`);
    }
  }
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  options: CircuitBreakerOptions;
}
