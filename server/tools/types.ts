// Simple type definitions for Deco compatibility
export interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface Workflow {
  name: string;
  description: string;
  steps: any[];
  inputSchema: any;
  outputSchema: any;
}
