/**
 * Converts a string to kebab case (e.g., "my-variable-name").
 * Supports camelCase, PascalCase, snake_case, and space-separated strings.
 * @param str The string to convert.
 * @returns The transformed string in kebab case.
 */
export function toKebabCase(str: string): string {
  // Replace uppercase letters in camelCase/PascalCase strings with a hyphen and the lowercase letter
  const camelSnakeSpaced = str.replace(/([a-z0-9])([A-Z])/g, "$1-$2");

  // Replace spaces and underscores with hyphens, then convert the whole string to lowercase
  const kebabCased = camelSnakeSpaced.replace(/[\s_]+/g, "-").toLowerCase();

  // Remove any leading or trailing hyphens that might result from the conversion
  return kebabCased.replace(/^-+|-+$/g, "");
}
