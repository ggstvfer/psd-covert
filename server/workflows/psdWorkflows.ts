import { Workflow } from "../tools/types.ts";
import { parsePSDFile } from "../tools/psdParser.ts";
import { convertPSDToHTML } from "../tools/psdConverter.ts";
import { validateVisualFidelity, improveConversionQuality } from "../tools/psdValidator.ts";

/**
 * Main workflow for PSD to HTML conversion with validation and self-improvement
 */
export const psdConversionWorkflow: Workflow = {
  name: "psd_to_html_conversion",
  description: "Complete workflow for converting PSD files to HTML/CSS with AI-powered optimization and visual validation",
  steps: [
    {
      name: "parse_psd",
      description: "Parse the uploaded PSD file and extract layer information",
      tool: "parse_psd_file",
      input: {
        filePath: "{{input.filePath}}",
        includeImageData: false
      },
      output: "psdData"
    },
    {
      name: "convert_to_html",
      description: "Convert PSD data to semantic HTML/CSS using AI analysis",
      tool: "convert_psd_to_html",
      input: {
        psdData: "{{psdData}}",
        targetFramework: "{{input.targetFramework}}",
        responsive: "{{input.responsive}}"
      },
      output: "conversionResult"
    },
    {
      name: "validate_fidelity",
      description: "Validate visual fidelity between original PSD and converted HTML",
      tool: "validate_visual_fidelity",
      input: {
        originalPsdPath: "{{input.filePath}}",
        generatedHtmlPath: "{{conversionResult.html}}",
        threshold: "{{input.validationThreshold}}"
      },
      output: "validationResult"
    },
    {
      name: "check_quality",
      description: "Check if conversion meets quality standards",
      condition: "{{validationResult.passed}}",
      onTrue: {
        name: "quality_passed",
        description: "Conversion quality is acceptable",
        output: {
          status: "completed",
          result: "{{conversionResult}}",
          validation: "{{validationResult}}"
        }
      },
      onFalse: {
        name: "improve_quality",
        description: "Improve conversion quality based on validation feedback",
        tool: "improve_conversion_quality",
        input: {
          validationResults: "{{validationResult}}",
          originalPsdData: "{{psdData}}",
          currentHtml: "{{conversionResult.html}}"
        },
        output: "improvementResult"
      }
    },
    {
      name: "generate_preview",
      description: "Generate live preview of the final HTML",
      tool: "generate_html_preview",
      input: {
        htmlContent: "{{improvementResult.improvedHtml}}",
        cssContent: "{{conversionResult.css}}"
      },
      output: "previewResult"
    }
  ],
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the PSD file to convert"
      },
      targetFramework: {
        type: "string",
        description: "Target framework for HTML generation",
        default: "vanilla",
        enum: ["vanilla", "react", "vue", "angular"]
      },
      responsive: {
        type: "boolean",
        description: "Generate responsive design",
        default: true
      },
      validationThreshold: {
        type: "number",
        description: "Similarity threshold for validation (0-1)",
        default: 0.95,
        minimum: 0,
        maximum: 1
      },
      maxIterations: {
        type: "number",
        description: "Maximum number of improvement iterations",
        default: 3,
        minimum: 1,
        maximum: 10
      }
    },
    required: ["filePath"]
  },
  outputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["completed", "needs_improvement", "failed"]
      },
      result: {
        type: "object",
        description: "Final conversion result"
      },
      validation: {
        type: "object",
        description: "Validation results"
      },
      preview: {
        type: "object",
        description: "Preview information"
      },
      iterations: {
        type: "number",
        description: "Number of improvement iterations performed"
      }
    }
  }
};

/**
 * Workflow for batch PSD conversion
 */
export const batchPsdConversionWorkflow: Workflow = {
  name: "batch_psd_conversion",
  description: "Process multiple PSD files in batch with progress tracking",
  steps: [
    {
      name: "validate_batch",
      description: "Validate all files in the batch",
      customFunction: "validateBatchFiles",
      input: {
        files: "{{input.files}}"
      },
      output: "validatedFiles"
    },
    {
      name: "process_batch",
      description: "Process each file in the batch",
      loop: {
        items: "{{validatedFiles}}",
        itemName: "file",
        workflow: "psd_to_html_conversion",
        input: {
          filePath: "{{file.path}}",
          targetFramework: "{{input.targetFramework}}",
          responsive: "{{input.responsive}}",
          validationThreshold: "{{input.validationThreshold}}"
        }
      },
      output: "batchResults"
    },
    {
      name: "generate_report",
      description: "Generate batch processing report",
      customFunction: "generateBatchReport",
      input: {
        results: "{{batchResults}}",
        originalFiles: "{{validatedFiles}}"
      },
      output: "report"
    }
  ],
  inputSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            name: { type: "string" }
          }
        },
        description: "Array of PSD files to process"
      },
      targetFramework: {
        type: "string",
        default: "vanilla"
      },
      responsive: {
        type: "boolean",
        default: true
      },
      validationThreshold: {
        type: "number",
        default: 0.95
      }
    },
    required: ["files"]
  },
  outputSchema: {
    type: "object",
    properties: {
      batchResults: {
        type: "array",
        description: "Results of processing each file in the batch"
      },
      report: {
        type: "object",
        description: "Summary report of the batch processing"
      },
      success: {
        type: "boolean",
        description: "Whether the batch processing was successful"
      },
      totalFiles: {
        type: "number",
        description: "Total number of files processed"
      },
      processedFiles: {
        type: "number",
        description: "Number of successfully processed files"
      },
      failedFiles: {
        type: "number",
        description: "Number of files that failed to process"
      }
    }
  }
};

// Export workflows array
export const psdWorkflows = [psdConversionWorkflow, batchPsdConversionWorkflow];
