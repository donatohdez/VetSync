export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}
export function notFound(resource: string): AppError {
  return new AppError("NOT_FOUND", `${resource} no existe.`, 404);
}
