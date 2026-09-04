import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CorrelationIdContext } from './correlation-id.constants';
import { correlationIdInterceptor } from './correlation-id.interceptor';

describe('correlationIdInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('attaches a generated X-Correlation-Id header when none is present', () => {
    http.get('/api/v1/organization/universities').subscribe();

    const req = httpMock.expectOne('/api/v1/organization/universities');
    const correlationId = req.request.headers.get(CorrelationIdContext.HeaderName);
    expect(correlationId).toBeTruthy();
    expect(correlationId).toMatch(/^[0-9a-f-]{36}$/i);
    req.flush({});
  });

  it('generates a different id for each request', () => {
    http.get('/a').subscribe();
    http.get('/b').subscribe();

    const [reqA, reqB] = [httpMock.expectOne('/a'), httpMock.expectOne('/b')];
    expect(reqA.request.headers.get(CorrelationIdContext.HeaderName)).not.toBe(
      reqB.request.headers.get(CorrelationIdContext.HeaderName),
    );
    reqA.flush({});
    reqB.flush({});
  });

  it('does not override a correlation id the caller already set', () => {
    http
      .get('/api/v1/organization/universities', {
        headers: { [CorrelationIdContext.HeaderName]: 'caller-supplied-id' },
      })
      .subscribe();

    const req = httpMock.expectOne('/api/v1/organization/universities');
    expect(req.request.headers.get(CorrelationIdContext.HeaderName)).toBe('caller-supplied-id');
    req.flush({});
  });
});
