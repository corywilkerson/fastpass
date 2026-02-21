/** Sample Cloudflare API response data for tests. */

export const ACCOUNT_ID = 'acc-123';
export const TOKEN = 'test-token-abc';

export const apps = [
  {
    id: 'app-1',
    name: 'app.example.com',
    domain: 'app.example.com',
    type: 'self_hosted',
    session_duration: '24h',
    allowed_idps: ['idp-1'],
    auto_redirect_to_identity: true,
    policies: [
      {
        name: 'Allow — app.example.com',
        decision: 'allow',
        include: [{ email: { email: 'user@example.com' } }],
        precedence: 1,
      },
    ],
  },
  {
    id: 'app-2',
    name: 'api.example.com',
    domain: 'api.example.com',
    type: 'self_hosted',
    session_duration: '12h',
    allowed_idps: ['idp-2'],
    auto_redirect_to_identity: true,
    policies: [
      {
        name: 'Allow — api.example.com',
        decision: 'allow',
        include: [{ email_domain: { domain: 'example.com' } }],
        precedence: 1,
      },
    ],
  },
  {
    id: 'app-3',
    name: 'bookmark-app',
    domain: null,
    type: 'bookmark',
  },
];

export const idps = [
  { id: 'idp-1', name: 'Email Login', type: 'onetimepin' },
  { id: 'idp-2', name: 'GitHub', type: 'github' },
  { id: 'idp-3', name: 'Google', type: 'google' },
];

export const org = {
  auth_domain: 'myteam.cloudflareaccess.com',
  name: 'My Team',
};

export const zones = [
  { id: 'zone-1', name: 'example.com', status: 'active' },
];

export const accessLogs = [
  {
    created_at: '2025-06-01T10:00:00Z',
    user_email: 'user@example.com',
    app_domain: 'app.example.com',
    allowed: true,
    ip_address: '1.2.3.4',
  },
  {
    created_at: '2025-06-01T09:30:00Z',
    user_email: 'bad@evil.com',
    app_domain: 'app.example.com',
    allowed: false,
    ip_address: '5.6.7.8',
  },
  {
    created_at: '2025-06-01T09:00:00Z',
    user_email: 'dev@example.com',
    app_domain: 'api.example.com',
    allowed: true,
    ip_address: '9.10.11.12',
  },
];

export const accounts = [
  { id: 'acc-123', name: 'My Account' },
];

export function cfOk(result) {
  return { success: true, result, errors: [], messages: [] };
}

export function cfError(message, status = 400) {
  return {
    success: false,
    result: null,
    errors: [{ code: 1000, message }],
    messages: [],
  };
}
