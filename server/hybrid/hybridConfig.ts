/**
 * Estratégia Híbrida para PSD-Convert
 * Solução para limites do plano gratuito do Cloudflare Workers
 */

export interface HybridConfig {
  // Limites do plano gratuito
  freeTierLimits: {
    cpuMs: 10000;      // 10 segundos
    memoryMb: 128;     // 128 MB
    requestsPerDay: 100000;
  };

  // Estratégias de processamento
  strategies: {
    // Para arquivos pequenos (< 5MB)
    smallFiles: {
      maxSize: 5 * 1024 * 1024; // 5MB
      method: 'direct'; // Processamento direto
      estimatedTime: 2000; // ~2s
    };

    // Para arquivos médios (5-15MB)
    mediumFiles: {
      maxSize: 15 * 1024 * 1024; // 15MB
      method: 'optimized'; // Processamento otimizado
      estimatedTime: 5000; // ~5s
    };

    // Para arquivos grandes (> 15MB)
    largeFiles: {
      maxSize: 50 * 1024 * 1024; // 50MB
      method: 'hybrid'; // Arquitetura híbrida
      estimatedTime: 8000; // ~8s
    };
  };

  // Configuração de chunks para processamento híbrido
  chunking: {
    maxLayersPerChunk: 10;
    maxDepth: 1;
    enableImageOptimization: false;
    enableTextExtraction: true;
    enableShapeDetection: false;
  };
}

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
