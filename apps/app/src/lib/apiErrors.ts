export class ApiHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export class ApiNetworkError extends Error {
  readonly cause: Error;

  constructor(cause: Error, message = 'Não foi possível acessar o servidor.') {
    super(message);
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}
