// ... existing code ...

// Import workflow arrays from domain files
// import { todoWorkflows } from "./todos.ts";
// import { userWorkflows } from "./user.ts";
import { psdWorkflows } from "./psdWorkflows.ts";

// Export all workflows from all domains
export const workflows = [
  // ...todoWorkflows,
  // ...userWorkflows,
  ...psdWorkflows,
];

// Re-export domain-specific workflows for direct access if needed   
// export { todoWorkflows } from "./todos.ts";
// export { userWorkflows } from "./user.ts";
export { psdWorkflows } from "./psdWorkflows.ts";
