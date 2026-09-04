import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocaleService } from './locale.service';
import { localeInterceptor } from './locale.interceptor';

describe('localeInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let localeService: LocaleService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([localeInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    localeService = TestBed.inject(LocaleService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("appends ?lang= with the active locale (Organization endpoints' real convention)", () => {
    http.get('/api/v1/organization/faculties').subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/organization/faculties');
    expect(req.request.params.get('lang')).toBe('en');
    req.flush({});
  });

  it('reflects a locale change on the next request', () => {
    localeService.setLocale('bn');
    http.get('/api/v1/organization/faculties').subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/organization/faculties');
    expect(req.request.params.get('lang')).toBe('bn');
    req.flush({});
  });

  it('also sets the Accept-Language header', () => {
    http.get('/api/v1/organization/faculties').subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/organization/faculties');
    expect(req.request.headers.get('Accept-Language')).toBe('en');
    req.flush({});
  });

  it('does not override an explicit lang param the caller already set', () => {
    http.get('/api/v1/organization/faculties', { params: { lang: 'bn' } }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/organization/faculties');
    expect(req.request.params.get('lang')).toBe('bn');
    req.flush({});
  });
});
