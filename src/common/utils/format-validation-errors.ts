import { ValidationError } from "class-validator";

export function formatValidationErrors(
  errors: ValidationError[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  if (!Array.isArray(errors)) {
    return result;
  }

  const addMessages = (path: string, messages: string[]) => {
    result[path] = [...(result[path] ?? []), ...messages];
  };

  const walk = (error: ValidationError, path = ""): void => {
    const currentPath = path
      ? `${path}.${error.property}`
      : error.property || "_";

    if (error.constraints) {
      addMessages(currentPath, Object.values(error.constraints));
    }

    if (error.children) {
      for (const child of error.children) {
        walk(child, currentPath);
      }
    }
  };

  for (const error of errors) {
    walk(error);
  }

  return result;
}
