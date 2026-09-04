import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { toUmsApiError } from './error-mapping.util';

describe('toUmsApiError', () => {
  it('maps a ums-core ProblemDetails body to a normalized UmsApiError', () => {
    const error = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
      url: '/api/v1/identity/users/00000000-0000-0000-0000-000000000000',
      error: {
        type: 'https://ums-suite.internal/errors/notfound',
        title: 'User not found.',
        status: 404,
        code: 'USER_NOT_FOUND',
        correlationId: 'corr-123',
      },
    });

    const result = toUmsApiError(error);

    expect(result.status).toBe(404);
    expect(result.message).toBe('User not found.');
    expect(result.code).toBe('USER_NOT_FOUND');
    expect(result.correlationId).toBe('corr-123');
    expect(result.problemDetails?.type).toBe('https://ums-suite.internal/errors/notfound');
  });

  it('maps an unhandled-exception ProblemDetails body (GlobalExceptionHandler shape)', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        status: 500,
        title: 'An unexpected error occurred.',
        type: 'https://ums-suite.internal/errors/unexpected',
        code: 'UNEXPECTED_ERROR',
        correlationId: 'corr-500',
      },
    });

    const result = toUmsApiError(error);

    expect(result.code).toBe('UNEXPECTED_ERROR');
    expect(result.message).toBe('An unexpected error occurred.');
  });

  it('falls back to the correlation-id response header when the body has none', () => {
    const error = new HttpErrorResponse({
      status: 502,
      error: { title: 'Bad gateway' },
      headers: new HttpHeaders({ 'X-Correlation-Id': 'header-corr-id' }),
    });

    expect(toUmsApiError(error).correlationId).toBe('header-corr-id');
  });

  it('handles a non-JSON/empty body as a network-level failure', () => {
    const error = new HttpErrorResponse({ status: 0, error: null, statusText: 'Unknown Error' });

    const result = toUmsApiError(error);

    expect(result.status).toBe(0);
    expect(result.problemDetails).toBeUndefined();
  });

  it('handles a non-HttpErrorResponse throwable', () => {
    const result = toUmsApiError(new Error('boom'));

    expect(result.status).toBe(0);
    expect(result.message).toBe('boom');
  });
});
