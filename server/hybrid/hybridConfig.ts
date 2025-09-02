/**
 * Estratégia Híbrida para PSD-Convert
 * Solução para limites do plano gratuito do Cloudflare Workers
 */

export interface HybridConfig {
  freeTierLimits: {
    cpuMs: number;
    memoryMb: number;
    requestsPerDay: number;
  };
  strategies: {
    smallFiles: {
      maxSize: number;
      method: 'direct';
      estimatedTime: number;
    };
    mediumFiles: {
      maxSize: number;
      method: 'optimized';
      estimatedTime: number;
    };
    largeFiles: {
      maxSize: number;
      method: 'hybrid';
      estimatedTime: number;
    };
  };
  chunking: {
    maxLayersPerChunk: number;
    maxDepth: number;
    enableImageOptimization: boolean;
    enableTextExtraction: boolean;
    enableShapeDetection: boolean;
  };
}

export const defaultHybridConfig: HybridConfig = {
  freeTierLimits: {
    cpuMs: 10000,
    memoryMb: 128,
    requestsPerDay: 100000,
  },
  strategies: {
    smallFiles: {
      maxSize: 5 * 1024 * 1024,
      method: 'direct',
      estimatedTime: 2000,
    },
    mediumFiles: {
      maxSize: 15 * 1024 * 1024,
      method: 'optimized',
      estimatedTime: 5000,
    },
    largeFiles: {
      maxSize: 50 * 1024 * 1024,
      method: 'hybrid',
      estimatedTime: 8000,
    },
  },
  chunking: {
    maxLayersPerChunk: 10,
    maxDepth: 1,
    enableImageOptimization: false,
    enableTextExtraction: true,
    enableShapeDetection: false,
  },
};

/**
 * Detector de estratégia baseado no arquivo
 */
export function detectProcessingStrategy(fileSize: number, estimatedLayers: number): string {
  if (fileSize < 5 * 1024 * 1024) {
    return 'smallFiles';
  } else if (fileSize < 15 * 1024 * 1024) {
    return 'mediumFiles';
  } else {
    return 'largeFiles';
  }
}

/**
 * Estimativa de tempo de processamento
 */
export function estimateProcessingTime(fileSize: number, strategy: string): number {
  const baseTime = 1000; // 1 segundo base
  const sizeMultiplier = fileSize / (1024 * 1024); // MB
  const strategyMultiplier = {
    smallFiles: 1,
    mediumFiles: 2,
    largeFiles: 3
  }[strategy] || 1;

  return Math.min(baseTime * sizeMultiplier * strategyMultiplier, 8000);
}

/**
 * Verifica se o processamento é viável no plano gratuito
 */
export function isViableForFreeTier(fileSize: number, estimatedTime: number): boolean {
  const maxTime = 8000; // 8 segundos (margem de segurança)
  const maxSize = 20 * 1024 * 1024; // 20MB (margem de segurança)

  return fileSize <= maxSize && estimatedTime <= maxTime;
}
