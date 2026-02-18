import pc from 'picocolors';

const BASE = 'https://api.cloudflare.com/client/v4';

export function createApi({ token, accountId }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const accountPath = `/accounts/${accountId}`;

  async function request(method, path, body) {
    // Paths starting with / but not /accounts or /zones get the account prefix
    const fullPath = path.startsWith('/zones') || path.startsWith('/accounts')
      ? path
      : `${accountPath}${path}`;

    const url = `${BASE}${fullPath}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const json = await res.json();

    if (!json.success) {
      const errors = json.errors?.map((e) => e.message).join(', ') || 'Unknown error';
      throw new ApiError(errors, json.errors, res.status);
    }

    return json;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
  };
}

export class ApiError extends Error {
  constructor(message, errors, status) {
    super(message);
    this.name = 'ApiError';
    this.errors = errors;
    this.status = status;
  }
}

export function handleApiError(err) {
  if (err instanceof ApiError) {
    console.error(pc.red(`\nCloudflare API error: ${err.message}`));
    if (err.status === 403) {
      console.error(pc.yellow('Your API token may not have the required permissions.'));
      console.error('Needed scopes: Access: Organizations + Identity Providers + Apps and Policies (Edit)\n');
    }
  } else {
    console.error(pc.red(`\nError: ${err.message}\n`));
  }
  process.exit(1);
}
