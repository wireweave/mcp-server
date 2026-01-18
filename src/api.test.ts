import { describe, it, expect, vi } from 'vitest';
import { buildRequest, parseErrorMessage, extractCreditInfo, callApi, type ApiConfig } from './api.js';
import type { ToolEndpoint } from './tools.js';

describe('buildRequest', () => {
  const config: ApiConfig = {
    apiUrl: 'https://api.example.com',
    apiKey: 'test-key',
  };

  it('should build POST request with body', () => {
    const endpoint: ToolEndpoint = { method: 'POST', path: '/tools/parse' };
    const args = { source: 'Screen "Test" {}' };

    const { url, options } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/tools/parse');
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ source: 'Screen "Test" {}' }));
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((options.headers as Record<string, string>)['x-api-key']).toBe('test-key');
  });

  it('should build GET request with query parameters', () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/tools/examples' };
    const args = { category: 'form', limit: 5 };

    const { url, options } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/tools/examples?category=form&limit=5');
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
  });

  it('should handle array query parameters', () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/cloud/wireframes' };
    const args = { tags: ['ui', 'mobile'] };

    const { url } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/cloud/wireframes?tags=ui%2Cmobile');
  });

  it('should replace path parameters', () => {
    const endpoint: ToolEndpoint = {
      method: 'PATCH',
      path: '/cloud/projects/:id',
      pathParams: ['id'],
    };
    const args = { id: 'proj-123', name: 'New Name' };

    const { url, options } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/cloud/projects/proj-123');
    expect(JSON.parse(options.body as string)).toEqual({ name: 'New Name' });
  });

  it('should replace multiple path parameters', () => {
    const endpoint: ToolEndpoint = {
      method: 'POST',
      path: '/cloud/wireframes/:wireframeId/versions/:version/restore',
      pathParams: ['wireframeId', 'version'],
    };
    const args = { wireframeId: 'wf-456', version: 3 };

    const { url } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/cloud/wireframes/wf-456/versions/3/restore');
  });

  it('should skip undefined and null query parameters', () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/cloud/wireframes' };
    const args = { projectId: undefined, tags: null, limit: 10 };

    const { url } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/cloud/wireframes?limit=10');
  });

  it('should not add body for GET requests', () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/billing/balance' };

    const { options } = buildRequest(config, endpoint);

    expect(options.body).toBeUndefined();
  });

  it('should handle PATCH method with body', () => {
    const endpoint: ToolEndpoint = {
      method: 'PATCH',
      path: '/cloud/wireframes/:id',
      pathParams: ['id'],
    };
    const args = { id: 'wf-123', name: 'Updated', code: 'Screen {}' };

    const { options } = buildRequest(config, endpoint, args);

    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body as string)).toEqual({ name: 'Updated', code: 'Screen {}' });
  });

  it('should handle DELETE method', () => {
    const endpoint: ToolEndpoint = {
      method: 'DELETE',
      path: '/cloud/projects/:id',
      pathParams: ['id'],
    };
    const args = { id: 'proj-123' };

    const { url, options } = buildRequest(config, endpoint, args);

    expect(url).toBe('https://api.example.com/cloud/projects/proj-123');
    expect(options.method).toBe('DELETE');
  });
});

describe('parseErrorMessage', () => {
  it('should return specific message for 401', () => {
    const message = parseErrorMessage(401, {});
    expect(message).toBe('Invalid API key. Get one at https://dashboard.wireweave.org');
  });

  it('should return specific message for 402 with custom message', () => {
    const message = parseErrorMessage(402, { message: 'Need 50 more credits' });
    expect(message).toBe('Insufficient credits. Need 50 more credits');
  });

  it('should return default message for 402 without custom message', () => {
    const message = parseErrorMessage(402, {});
    expect(message).toBe('Insufficient credits. Please add more credits.');
  });

  it('should return specific message for 403', () => {
    const message = parseErrorMessage(403, {});
    expect(message).toBe('Access denied. Upgrade your plan for this feature.');
  });

  it('should return specific message for 429', () => {
    const message = parseErrorMessage(429, {});
    expect(message).toBe('Rate limit exceeded. Please wait and try again.');
  });

  it('should return generic message for 5xx', () => {
    expect(parseErrorMessage(500, {})).toBe('Service temporarily unavailable');
    expect(parseErrorMessage(502, {})).toBe('Service temporarily unavailable');
    expect(parseErrorMessage(503, {})).toBe('Service temporarily unavailable');
  });

  it('should return error message from response', () => {
    const message = parseErrorMessage(400, { error: 'Invalid source code' });
    expect(message).toBe('Invalid source code');
  });

  it('should prefer error over message', () => {
    const message = parseErrorMessage(400, { error: 'Error text', message: 'Message text' });
    expect(message).toBe('Error text');
  });

  it('should fallback to message if no error', () => {
    const message = parseErrorMessage(400, { message: 'Message text' });
    expect(message).toBe('Message text');
  });

  it('should return default message if nothing available', () => {
    const message = parseErrorMessage(400, {});
    expect(message).toBe('Request failed');
  });
});

describe('extractCreditInfo', () => {
  it('should extract all credit headers', () => {
    const headers = new Headers({
      'X-Credits-Balance': '100',
      'X-Credits-Monthly-Remaining': '500',
      'X-Credits-Total-Available': '600',
    });

    const info = extractCreditInfo(headers);

    expect(info).toEqual({
      balance: 100,
      monthlyRemaining: 500,
      totalAvailable: 600,
    });
  });

  it('should handle missing headers', () => {
    const headers = new Headers({});

    const info = extractCreditInfo(headers);

    expect(info).toEqual({
      balance: undefined,
      monthlyRemaining: undefined,
      totalAvailable: undefined,
    });
  });

  it('should handle partial headers', () => {
    const headers = new Headers({
      'X-Credits-Balance': '50',
    });

    const info = extractCreditInfo(headers);

    expect(info).toEqual({
      balance: 50,
      monthlyRemaining: undefined,
      totalAvailable: undefined,
    });
  });
});

describe('callApi', () => {
  const config: ApiConfig = {
    apiUrl: 'https://api.example.com',
    apiKey: 'test-key',
  };

  it('should throw error if API key is missing', async () => {
    const noKeyConfig: ApiConfig = { apiUrl: 'https://api.example.com', apiKey: '' };
    const endpoint: ToolEndpoint = { method: 'GET', path: '/tools/grammar' };

    await expect(callApi(noKeyConfig, endpoint)).rejects.toThrow('WIREWEAVE_API_KEY environment variable is required');
  });

  it('should call fetch with correct parameters', async () => {
    const endpoint: ToolEndpoint = { method: 'POST', path: '/tools/parse' };
    const args = { source: 'Screen {}' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ ast: {} }),
    });

    await callApi(config, endpoint, args, mockFetch);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/tools/parse',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        },
        body: JSON.stringify({ source: 'Screen {}' }),
      })
    );
  });

  it('should return result with credit info when present', async () => {
    const endpoint: ToolEndpoint = { method: 'POST', path: '/tools/parse' };
    const args = { source: 'Screen {}' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'X-Credits-Balance': '95',
        'X-Credits-Total-Available': '195',
      }),
      json: async () => ({ ast: { type: 'screen' } }),
    });

    const result = await callApi(config, endpoint, args, mockFetch);

    expect(result).toEqual({
      ast: { type: 'screen' },
      _credits: {
        balance: 95,
        monthlyRemaining: undefined,
        totalAvailable: 195,
      },
    });
  });

  it('should return result without credit info when headers missing', async () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/tools/grammar' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({ grammar: '...' }),
    });

    const result = await callApi(config, endpoint, undefined, mockFetch);

    expect(result).toEqual({ grammar: '...' });
    expect(result).not.toHaveProperty('_credits');
  });

  it('should throw error on non-ok response', async () => {
    const endpoint: ToolEndpoint = { method: 'POST', path: '/tools/parse' };
    const args = { source: 'invalid' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({ error: 'Parse error at line 1' }),
    });

    await expect(callApi(config, endpoint, args, mockFetch)).rejects.toThrow('Parse error at line 1');
  });

  it('should handle 401 error correctly', async () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/billing/balance' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => ({}),
    });

    await expect(callApi(config, endpoint, undefined, mockFetch)).rejects.toThrow(
      'Invalid API key. Get one at https://dashboard.wireweave.org'
    );
  });

  it('should handle 402 error with message', async () => {
    const endpoint: ToolEndpoint = { method: 'POST', path: '/agent/generate' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      headers: new Headers(),
      json: async () => ({ message: 'Requires 50 credits, you have 30' }),
    });

    await expect(callApi(config, endpoint, undefined, mockFetch)).rejects.toThrow(
      'Insufficient credits. Requires 50 credits, you have 30'
    );
  });

  it('should handle network errors gracefully', async () => {
    const endpoint: ToolEndpoint = { method: 'GET', path: '/tools/grammar' };

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(callApi(config, endpoint, undefined, mockFetch)).rejects.toThrow('Network error');
  });

  it('should handle JSON parse errors on error response', async () => {
    const endpoint: ToolEndpoint = { method: 'POST', path: '/tools/parse' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => { throw new Error('Invalid JSON'); },
    });

    await expect(callApi(config, endpoint, undefined, mockFetch)).rejects.toThrow('Service temporarily unavailable');
  });
});
