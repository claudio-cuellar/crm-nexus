export interface AuthContext {
  userId: string;
  email?: string;
  platformAdmin: boolean;
}

export interface TenantContext {
  orgId: string;
  roles: string[];
  permissions: string[];
}

export interface RequestContext {
  requestId: string;
  /** filled by the Phase-3 auth seam when opts.auth is set */
  auth?: AuthContext;
  /** filled by the Phase-4 tenant resolution once auth exists */
  tenant?: TenantContext;
}