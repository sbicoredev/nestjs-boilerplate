import "reflect-metadata";

import {
  ArgumentsHost,
  HttpStatus,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ValidationError } from "class-validator";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { UnprocessableEntityExceptionFilter } from "./unprocessable-entity-exception.filter";

describe("UnprocessableEntityExceptionFilter", () => {
  let filter: UnprocessableEntityExceptionFilter;
  let jsonMock: Mock;
  let statusMock: Mock;
  let req: { url: string; id: string };

  function buildHost(): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
  }

  function buildValidationError(
    property: string,
    constraints: Record<string, string>
  ): ValidationError {
    const error = new ValidationError();
    error.property = property;
    error.constraints = constraints;
    return error;
  }

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { url: "/api/todos", id: "req_xyz789" };
    filter = new UnprocessableEntityExceptionFilter();
  });

  it("always responds with 422", () => {
    const exception = new UnprocessableEntityException({
      errors: [],
    });

    filter.catch(exception, buildHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it("reshapes class-validator ValidationError[] into a flat field -> messages map", () => {
    const exception = new UnprocessableEntityException({
      errors: [
        buildValidationError("title", {
          isNotEmpty: "title should not be empty",
        }),
      ],
    });

    filter.catch(exception, buildHost());

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: { title: ["title should not be empty"] },
        message: "Validation failed!",
      })
    );
  });

  it("collects multiple constraint messages for the same field", () => {
    const exception = new UnprocessableEntityException({
      errors: [
        buildValidationError("title", {
          isNotEmpty: "title should not be empty",
          isString: "title must be a string",
        }),
      ],
    });

    filter.catch(exception, buildHost());

    const [[body]] = jsonMock.mock.calls;
    expect(body.errors.title).toEqual(
      expect.arrayContaining([
        "title should not be empty",
        "title must be a string",
      ])
    );
  });

  it("collects errors for multiple distinct fields", () => {
    const exception = new UnprocessableEntityException({
      errors: [
        buildValidationError("title", { isNotEmpty: "title required" }),
        buildValidationError("isCompleted", { isBoolean: "must be boolean" }),
      ],
    });

    filter.catch(exception, buildHost());

    const [[body]] = jsonMock.mock.calls;
    expect(body.errors).toEqual({
      title: ["title required"],
      isCompleted: ["must be boolean"],
    });
  });

  it("falls back to an empty errors object when the response shape isn't a ValidationError array", () => {
    const exception = new UnprocessableEntityException("Unprocessable Entity");

    filter.catch(exception, buildHost());

    const [[body]] = jsonMock.mock.calls;
    expect(body.errors).toEqual({});
  });

  it("includes the request id and path in the response body", () => {
    const exception = new UnprocessableEntityException({ errors: [] });

    filter.catch(exception, buildHost());

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req_xyz789", path: "/api/todos" })
    );
  });
});
