import { Transform, TransformFnParams, Type } from "class-transformer";

/**
 * It converts a string to a boolean
 * @returns A function that returns a PropertyDecorator
 */
export function AsBoolean(): PropertyDecorator {
  const typeDecorator = Type(() => String);
  const transformDecorator = Transform(
    (transformParams: TransformFnParams): boolean | undefined =>
      transformParams.value != null && typeof transformParams.value === "string"
        ? transformParams.value.toLowerCase() === "true"
        : undefined
  );
  return function transformToBoolean(target, propertyName: string | symbol) {
    typeDecorator(target, propertyName);
    transformDecorator(target, propertyName);
  };
}
