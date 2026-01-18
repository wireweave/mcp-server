import type { ToolEndpoint } from './tools.js';

export interface ApiConfig {
  apiUrl: string;
  apiKey: string;
}

export interface CreditInfo {
  balance?: number;
  monthlyRemaining?: number;
  totalAvailable?: number;
}

export interface ApiResult {
  data: unknown;
  credits?: CreditInfo;
}

/**
 * Build the request URL and options for an API call
 */
export function buildRequest(
  config: ApiConfig,
  endpoint: ToolEndpoint,
  args?: Record<string, unknown>
): { url: string; options: RequestInit; bodyForGet: Record<string, unknown> } {
  // Build URL with path parameters
  let path = endpoint.path;
  const body: Record<string, unknown> = { ...args };

  // Replace path parameters (e.g., :id, :wireframeId)
  if (endpoint.pathParams && args) {
    for (const param of endpoint.pathParams) {
      const value = args[param];
      if (value !== undefined) {
        path = path.replace(`:${param}`, String(value));
        delete body[param]; // Remove from body since it's in the path
      }
    }
  }

  let url = `${config.apiUrl}${path}`;
  const options: RequestInit = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
    },
  };

  if (['POST', 'PATCH', 'PUT'].includes(endpoint.method) && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  } else if (endpoint.method === 'GET' && Object.keys(body).length > 0) {
    // Add query parameters for GET requests
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array parameters (e.g., tags)
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    }
    url = `${url}?${params.toString()}`;
  }

  return { url, options, bodyForGet: body };
}

/**
 * Parse error response into user-friendly message
 */
export function parseErrorMessage(status: number, error: { error?: string; message?: string }): string {
  if (status === 401) return 'Invalid API key. Get one at https://dashboard.wireweave.org';
  if (status === 402) return `Insufficient credits. ${error.message || 'Please add more credits.'}`;
  if (status === 403) return 'Access denied. Upgrade your plan for this feature.';
  if (status === 429) return 'Rate limit exceeded. Please wait and try again.';
  if (status >= 500) return 'Service temporarily unavailable';
  return error.error || error.message || 'Request failed';
}

/**
 * Extract credit info from response headers
 */
export function extractCreditInfo(headers: Headers): CreditInfo {
  return {
    balance: headers.get('X-Credits-Balance') ? parseInt(headers.get('X-Credits-Balance')!, 10) : undefined,
    monthlyRemaining: headers.get('X-Credits-Monthly-Remaining') ? parseInt(headers.get('X-Credits-Monthly-Remaining')!, 10) : undefined,
    totalAvailable: headers.get('X-Credits-Total-Available') ? parseInt(headers.get('X-Credits-Total-Available')!, 10) : undefined,
  };
}

/**
 * Call the Wireweave API Server
 */
export async function callApi(
  config: ApiConfig,
  endpoint: ToolEndpoint,
  args?: Record<string, unknown>,
  fetchFn: typeof fetch = fetch
): Promise<unknown> {
  if (!config.apiKey) {
    throw new Error('WIREWEAVE_API_KEY environment variable is required');
  }

  const { url, options } = buildRequest(config, endpoint, args);

  const response = await fetchFn(url, options);

  // Extract credit info from headers
  const creditInfo = extractCreditInfo(response.headers);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const userMessage = parseErrorMessage(response.status, error);
    throw new Error(userMessage);
  }

  const result = await response.json();

  // Add credit info to successful responses if available
  if (creditInfo.balance !== undefined || creditInfo.totalAvailable !== undefined) {
    return {
      ...result,
      _credits: creditInfo,
    };
  }

  return result;
}
