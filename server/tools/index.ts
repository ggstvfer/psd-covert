// ... existing code ...
import { todoTools } from "./todos.ts";
import { userTools } from "./user.ts";
import { psdTools } from "./psdParser.ts";
import { psdConverterTools } from "./psdConverter.ts";
import { psdValidationTools } from "./psdValidator.ts";

// Export all tools from all domains
export const tools = [
  ...todoTools,
  ...userTools,
  ...psdTools,
  ...psdConverterTools,
  ...psdValidationTools,
];

// Re-export domain-specific tools for direct access if needed       
export { todoTools } from "./todos.ts";
export { userTools } from "./user.ts";
export { psdTools } from "./psdParser.ts";
export { psdConverterTools } from "./psdConverter.ts";
export { psdValidationTools } from "./psdValidator.ts";
