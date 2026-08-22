import { ValidationError } from "class-validator";

export function formatValidationErrors(
  errors: ValidationError[]
): Record<string, string[]> {
  const errorsByPropertyPath: Record<string, string[]> = {};

  if (!Array.isArray(errors)) {
    return errorsByPropertyPath;
  }

  const addMessages = (propertyPath: string, messages: string[]) => {
    errorsByPropertyPath[propertyPath] = [
      ...(errorsByPropertyPath[propertyPath] ?? []),
      ...messages,
    ];
  };

  // class-validator nests errors for object/array properties under
  // `children`, so this walks the tree, accumulating a dotted path
  // (e.g. "address.city") as it descends.
  const collectMessagesFromNode = (
    error: ValidationError,
    parentPath = ""
  ): void => {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property || "_";

    if (error.constraints) {
      addMessages(currentPath, Object.values(error.constraints));
    }

    if (error.children) {
      for (const childError of error.children) {
        collectMessagesFromNode(childError, currentPath);
      }
    }
  };

  for (const error of errors) {
    collectMessagesFromNode(error);
  }

  return errorsByPropertyPath;
}
