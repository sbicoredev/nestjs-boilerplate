import { DomainError } from "~/common/error/domain-error";

const todoErrorCodes = {
  notFound: "todo.not_found",
  alreadyCompleted: "todo.already_completed",
  invalidTitle: "todo.title_invalid",
} as const;

type TodoErrorCode = (typeof todoErrorCodes)[keyof typeof todoErrorCodes];

interface TodoDomainError extends DomainError {
  code: TodoErrorCode;
}

export const todoErrors = {
  notFound: (id: string): TodoDomainError => ({
    code: todoErrorCodes.notFound,
    message: `Todo with id ${id} was not found`,
    metadata: { id },
  }),
  invalidTitle: (reason: string): TodoDomainError => ({
    code: todoErrorCodes.invalidTitle,
    message: `Invalid title: ${reason}`,
  }),
};
