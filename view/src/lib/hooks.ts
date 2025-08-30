// ✅ COMPLETED: Real backend integration implemented in Fase 5
// All hooks now use real backend API calls

export interface ConversionResult {
  success: boolean;
  html: string;
  css: string;
  components: any[];
  metadata: {
    framework: string;
    responsive: boolean;
    semantic: boolean;
    accessibility: boolean;
    generatedAt: string;
  };
  error?: string;
}

export interface ValidationResult {
  success: boolean;
  similarity: number;
  differences: number;
  totalPixels: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
  diffImageUrl?: string;
  validationDate: string;
  threshold: number;
  error?: string;
}

export interface ImprovementResult {
  success: boolean;
  improvedHtml: string;
  improvedCss: string;
  improvements: string[];
  confidence: number;
  iteration: number;
  error?: string;
}

// Real backend integration functions using HTTP calls
const realClient = {
  PARSE_PSD_FILE: async (filePath: string) => {
    const response = await fetch('/api/tools/parse-psd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, includeImageData: false })
    });
    if (!response.ok) throw new Error('Failed to parse PSD');
    return response.json();
  },

  CONVERT_PSD_TO_HTML: async (psdData: any, targetFramework: string = "vanilla", responsive: boolean = true, semantic: boolean = true, accessibility: boolean = true) => {
    const response = await fetch('/api/tools/convert-psd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psdData, targetFramework, responsive, semantic, accessibility })
    });
    if (!response.ok) throw new Error('Failed to convert PSD');
    return response.json();
  },

  VISUAL_VALIDATION: async (psdData: any, htmlContent: string, cssContent: string, threshold: number = 0.95) => {
    const response = await fetch('/api/tools/validate-psd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ psdData, htmlContent, cssContent, threshold, includeDiffImage: true })
    });
    if (!response.ok) throw new Error('Failed to validate');
    return response.json();
  },

  SELF_REINFORCE: async (validationResults: any, originalPsdData: any, currentHtml: string, currentCss: string, iteration: number = 1) => {
    const response = await fetch('/api/tools/self-reinforce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validationResults, originalPsdData, currentHtml, currentCss, iteration })
    });
    if (!response.ok) throw new Error('Failed to self-reinforce');
    return response.json();
  },

  GENERATE_HTML_PREVIEW: async (htmlContent: string, cssContent: string) => {
    const response = await fetch('/api/tools/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ htmlContent, cssContent })
    });
    if (!response.ok) throw new Error('Failed to generate preview');
    return response.json();
  }
};

// Use real backend client
const activeClient = realClient;

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// PSD-specific hooks for the converter application

// PSD-related hooks
export interface PSDData {
  fileName: string;
  width: number;
  height: number;
  layers: any[];
  metadata: any;
}

export interface ValidationResult {
  success: boolean;
  similarity: number;
  differences: number;
  totalPixels: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
  diffImageUrl?: string;
  validationDate: string;
  threshold: number;
  error?: string;
}

export interface ImprovementResult {
  success: boolean;
  improvedHtml: string;
  improvedCss: string;
  improvements: string[];
  confidence: number;
  iteration: number;
  error?: string;
}

export const useParsePSD = () => {
  return useMutation({
    mutationFn: (filePath: string) => activeClient.PARSE_PSD_FILE(filePath),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("PSD parsed successfully!");
      } else {
        toast.error("Failed to parse PSD file");
      }
    },
  });
};

export const useConvertPSDToHTML = () => {
  return useMutation({
    mutationFn: ({ psdData, targetFramework = "vanilla" }: {
      psdData: PSDData;
      targetFramework?: string;
    }) => activeClient.CONVERT_PSD_TO_HTML(psdData, targetFramework),
    onSuccess: (data: ConversionResult) => {
      if (data.success) {
        toast.success("PSD converted to HTML successfully!");
      } else {
        toast.error(data.error || "Failed to convert PSD");
      }
    },
  });
};

export const useGeneratePreview = () => {
  return useMutation({
    mutationFn: ({ htmlContent, cssContent }: {
      htmlContent: string;
      cssContent: string;
    }) => activeClient.GENERATE_HTML_PREVIEW(htmlContent, cssContent),
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Preview generated successfully!");
      } else {
        toast.error("Failed to generate preview");
      }
    },
  });
};

// Visual validation hooks
export const useVisualValidation = () => {
  return useMutation({
    mutationFn: ({ psdData, htmlContent, cssContent, threshold = 0.95 }: {
      psdData: PSDData;
      htmlContent: string;
      cssContent: string;
      threshold?: number;
    }) => activeClient.VISUAL_VALIDATION(psdData, htmlContent, cssContent, threshold),
    onSuccess: (data: ValidationResult) => {
      if (data.success) {
        if (data.passed) {
          toast.success(`Validation passed! Similarity: ${(data.similarity * 100).toFixed(1)}%`);
        } else {
          toast.warning(`Validation failed. Similarity: ${(data.similarity * 100).toFixed(1)}%`);
        }
      } else {
        toast.error(data.error || "Validation failed");
      }
    },
  });
};

export const useSelfReinforce = () => {
  return useMutation({
    mutationFn: ({ validationResults, originalPsdData, currentHtml, currentCss, iteration = 1 }: {
      validationResults: ValidationResult;
      originalPsdData: PSDData;
      currentHtml: string;
      currentCss: string;
      iteration?: number;
    }) => activeClient.SELF_REINFORCE(validationResults, originalPsdData, currentHtml, currentCss, iteration),
    onSuccess: (data: ImprovementResult) => {
      if (data.success) {
        toast.success(`Quality improved! Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      } else {
        toast.error(data.error || "Improvement failed");
      }
    },
  });
};
