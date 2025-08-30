declare module '@/lib/hooks' {
  export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  }

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

  export const useUser: () => { user: User } | null;
  export const useOptionalUser: () => { user: User } | null;
  export const useConvertPSDToHTML: () => any;
  export const useVisualValidation: () => any;
  export const useSelfReinforce: () => any;
}

declare module '@/lib/utils' {
  export const cn: (...classes: (string | undefined | null | false)[]) => string;
}

declare module '@/hooks/useToolCalls' {
  export interface ToolCall {
    tool: string;
    timestamp: number;
    args?: any;
    result?: any;
    input?: any;
    output?: any;
  }

  export const useToolCalls: () => { calls: ToolCall[]; clearCalls: () => void };
}

declare module '@/components/ui/button' {
  import { ComponentProps } from 'react';
  export const Button: (props: ComponentProps<'button'> & { variant?: string; size?: string; asChild?: boolean }) => JSX.Element;
}

declare module '@/components/ui/card' {
  import { ComponentProps } from 'react';
  export const Card: (props: ComponentProps<'div'>) => JSX.Element;
  export const CardContent: (props: ComponentProps<'div'>) => JSX.Element;
  export const CardDescription: (props: ComponentProps<'p'>) => JSX.Element;
  export const CardHeader: (props: ComponentProps<'div'>) => JSX.Element;
  export const CardTitle: (props: ComponentProps<'h3'>) => JSX.Element;
}

declare module '@/components/ui/popover' {
  import { ComponentProps } from 'react';
  export const Popover: (props: { children: React.ReactNode }) => JSX.Element;
  export const PopoverContent: (props: ComponentProps<'div'> & { align?: string }) => JSX.Element;
  export const PopoverTrigger: (props: { children: React.ReactNode; asChild?: boolean }) => JSX.Element;
}

declare module '@/components/ui/collapsible' {
  import { ComponentProps } from 'react';
  export const Collapsible: (props: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => JSX.Element;
  export const CollapsibleContent: (props: ComponentProps<'div'>) => JSX.Element;
  export const CollapsibleTrigger: (props: { children: React.ReactNode; asChild?: boolean }) => JSX.Element;
}

declare module '@/components/ui/progress' {
  import { ComponentProps } from 'react';
  export const Progress: (props: ComponentProps<'div'> & { value?: number }) => JSX.Element;
}

declare module '@/components/ui/badge' {
  import { ComponentProps } from 'react';
  export const Badge: (props: ComponentProps<'span'> & { variant?: string }) => JSX.Element;
}

declare module '@/components/ui/tabs' {
  import { ComponentProps } from 'react';
  export const Tabs: (props: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
    className?: string;
  }) => JSX.Element;
  export const TabsContent: (props: ComponentProps<'div'> & { value: string }) => JSX.Element;
  export const TabsList: (props: ComponentProps<'div'>) => JSX.Element;
  export const TabsTrigger: (props: ComponentProps<'button'> & { value: string }) => JSX.Element;
}
