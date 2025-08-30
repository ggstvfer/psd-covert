// Mock implementations until backend is fully set up

export interface ConversionResult {
  success: boolean;
  html: string;
  css: string;
  components: any[];
  metadata: {
    framework: string;
    responsive: boolean;
    semantic: boolean;
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

const mockClient = {
  GET_USER: () => Promise.resolve({ user: { id: "1", name: "User", email: "user@example.com", avatar: null } }),
  LIST_TODOS: () => Promise.resolve({ todos: [] }),
  GENERATE_TODO_WITH_AI: () => Promise.resolve({ todo: { id: Date.now(), title: "New Todo", completed: false } }),
  TOGGLE_TODO: () => Promise.resolve({ todo: { id: 1, title: "Todo", completed: true } }),
  DELETE_TODO: () => Promise.resolve({ deletedId: 1 }),
  PARSE_PSD_FILE: (filePath: string) => Promise.resolve({
    success: true,
    data: {
      fileName: filePath.split('/').pop(),
      width: 1920,
      height: 1080,
      layers: [
        { name: "Background", type: "layer", position: { left: 0, top: 0 }, width: 1920, height: 1080 },
        { name: "Header", type: "layer", position: { left: 0, top: 0 }, width: 1920, height: 200 },
        { name: "Content", type: "layer", position: { left: 100, top: 250 }, width: 1720, height: 600 },
        { name: "Footer", type: "layer", position: { left: 0, top: 900 }, width: 1920, height: 180 }
      ],
      metadata: { version: 1, channels: 4, colorMode: 3 }
    }
  }),
  CONVERT_PSD_TO_HTML: (psdData: any, targetFramework: string = "vanilla") => Promise.resolve({
    success: true,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSD Convertido - ${psdData.fileName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="header">Header Content</header>
  <main class="content">Main Content Area</main>
  <footer class="footer">Footer Content</footer>
</body>
</html>`,
    css: `.header { position: absolute; top: 0; left: 0; width: 100%; height: 200px; background: #f0f0f0; }
.content { position: absolute; top: 250px; left: 100px; width: 1720px; height: 600px; background: #ffffff; }
.footer { position: absolute; top: 900px; left: 0; width: 100%; height: 180px; background: #333333; }`,
    components: [
      { id: "header-1", type: "header", name: "Header", position: { left: 0, top: 0 } },
      { id: "content-1", type: "main", name: "Content", position: { left: 100, top: 250 } },
      { id: "footer-1", type: "footer", name: "Footer", position: { left: 0, top: 900 } }
    ],
    metadata: {
      framework: targetFramework,
      responsive: true,
      semantic: true,
      generatedAt: new Date().toISOString()
    }
  }),
  GENERATE_HTML_PREVIEW: (htmlContent: string, cssContent: string) => Promise.resolve({
    success: true,
    previewUrl: `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent.replace('</head>', `<style>${cssContent}</style></head>`))}`,
    previewHtml: htmlContent.replace('</head>', `<style>${cssContent}</style></head>`)
  }),
  VISUAL_VALIDATION: (psdData: any, htmlContent: string, cssContent: string, threshold: number = 0.95) => Promise.resolve({
    success: true,
    similarity: 0.87,
    differences: 1250,
    totalPixels: 1920 * 1080,
    passed: false,
    issues: [
      "Layout spacing slightly off",
      "Font rendering differences",
      "Color slight variations"
    ],
    recommendations: [
      "Adjust margin calculations",
      "Use exact font matching",
      "Fine-tune color conversion"
    ],
    diffImageUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
    validationDate: new Date().toISOString(),
    threshold
  }),
  SELF_REINFORCE: (validationResults: any, originalPsdData: any, currentHtml: string, currentCss: string, iteration: number = 1) => Promise.resolve({
    success: true,
    improvedHtml: currentHtml.replace(/position: absolute;/g, 'position: absolute; box-sizing: border-box;'),
    improvedCss: currentCss.replace(/}/g, '  transform: translateZ(0);\n}'),
    improvements: [
      "Enhanced pixel-perfect positioning algorithm",
      "Improved sub-pixel rendering precision",
      "Advanced color space conversion"
    ],
    confidence: Math.min(0.87 + (iteration * 0.05), 0.98),
    iteration: iteration + 1
  })
};
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

/**
 * This hook will throw an error if the user is not logged in.
 * You can safely use it inside routes that are protected by the `LoggedProvider`.
 */
export const useUser = () => {
  return useSuspenseQuery({
    queryKey: ["user"],
    queryFn: () => mockClient.GET_USER(),
    retry: false,
  });
};

/**
 * This hook will return null if the user is not logged in.
 * You can safely use it inside routes that are not protected by the `LoggedProvider`.
 * Good for pages that are public, for example.
 */
export const useOptionalUser = () => {
  return useSuspenseQuery({
    queryKey: ["user"],
    queryFn: () => mockClient.GET_USER(),
    retry: false,
  });
};

/**
 * Example hooks from the template
 */

export const useListTodos = () => {
  return useSuspenseQuery({
    queryKey: ["todos"],
    queryFn: () => mockClient.LIST_TODOS(),
  });
};

export const useGenerateTodoWithAI = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mockClient.GENERATE_TODO_WITH_AI(),
    onSuccess: (data: { todo: any }) => {
      queryClient.setQueryData(["todos"], (old: any) => {
        if (!old?.todos) return old;
        return {
          ...old,
          todos: [...old.todos, data.todo],
        };
      });
    },
  });
};

export const useToggleTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_id: number) => mockClient.TOGGLE_TODO(),
    onSuccess: (data: { todo: any }) => {
      // Update the todos list with the updated todo
      queryClient.setQueryData(["todos"], (old: any) => {
        if (!old?.todos) return old;
        return {
          ...old,
          todos: old.todos.map((todo: any) =>
            todo.id === data.todo.id ? data.todo : todo
          ),
        };
      });
    },
  });
};

export const useDeleteTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_id: number) => mockClient.DELETE_TODO(),
    onSuccess: (data: { deletedId: number }) => {
      // Remove the deleted todo from the todos list
      queryClient.setQueryData(["todos"], (old: any) => {
        if (!old?.todos) return old;
        return {
          ...old,
          todos: old.todos.filter((todo: any) => todo.id !== data.deletedId),
        };
      });
      toast.success("Todo deleted successfully");
    },
  });
};

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
    mutationFn: (filePath: string) => mockClient.PARSE_PSD_FILE(filePath),
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
    }) => mockClient.CONVERT_PSD_TO_HTML(psdData, targetFramework),
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
    }) => mockClient.GENERATE_HTML_PREVIEW(htmlContent, cssContent),
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
    }) => mockClient.VISUAL_VALIDATION(psdData, htmlContent, cssContent, threshold),
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
    }) => mockClient.SELF_REINFORCE(validationResults, originalPsdData, currentHtml, currentCss, iteration),
    onSuccess: (data: ImprovementResult) => {
      if (data.success) {
        toast.success(`Quality improved! Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      } else {
        toast.error(data.error || "Improvement failed");
      }
    },
  });
};
