// Mock implementations until backend is fully set up
const mockClient = {
  GET_USER: () => Promise.resolve({ user: { id: "1", name: "User", email: "user@example.com", avatar: null } }),
  LIST_TODOS: () => Promise.resolve({ todos: [] }),
  GENERATE_TODO_WITH_AI: () => Promise.resolve({ todo: { id: Date.now(), title: "New Todo", completed: false } }),
  TOGGLE_TODO: () => Promise.resolve({ todo: { id: 1, title: "Todo", completed: true } }),
  DELETE_TODO: () => Promise.resolve({ deletedId: 1 }),
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
