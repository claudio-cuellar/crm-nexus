export type AppErrorCode =
  | "validation_failed"
  | "authentication_required"
  | "permission_denied"
  | "tenant_mismatch"
  | "no_active_organization"
  | "resource_not_found"
  | "state_conflict"
  | "idp_unavailable"
  | "internal_error";

export interface FieldIssue {
  path: string;
  message: string;
}

const STATUS: Record<AppErrorCode, number> = {
  validation_failed: 400,
  authentication_required: 401,
  permission_denied: 403,
  tenant_mismatch: 403,
  no_active_organization: 403,
  resource_not_found: 404,
  state_conflict: 409,
  idp_unavailable: 503,
  internal_error: 500,
};

const TITLES: Record<AppErrorCode, string> = {
  validation_failed: "Request Validation Failed",
  authentication_required: "Authentication Required",
  permission_denied: "Permission Denied",
  tenant_mismatch: "Organization Context Mismatch",
  no_active_organization: "No Active Organization",
  resource_not_found: "Resource Not Found",
  state_conflict: "State Conflict",
  idp_unavailable: "Identity Provider Unavailable",
  internal_error: "Internal Server Error",
};

export function appHttpStatus(code: AppErrorCode): number {
  return STATUS[code];
}

export function errorTitle(code: AppErrorCode): string {
  return TITLES[code];
}

/** Stable, namespaced, documentation-able machine identity for the problem type. */
export function errorTypeUri(code: AppErrorCode): string {
  return `https://errors.nexus.test/${code}`;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly extras?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, extras?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.extras = extras;
  }

  get status(): number {
    return appHttpStatus(this.code);
  }
}

export class ValidationFailed extends AppError {
  readonly issues: FieldIssue[];
  constructor(issues: FieldIssue[], message = "Request validation failed") {
    super("validation_failed", message);
    this.name = "ValidationFailed";
    this.issues = issues;
  }
}

export class AuthenticationRequired extends AppError {
  constructor(message = "A valid authenticated session is required") {
    super("authentication_required", message);
    this.name = "AuthenticationRequired";
  }
}

export class PermissionDenied extends AppError {
  constructor(permission?: string) {
    super("permission_denied", "You do not have permission to perform this action",
      permission ? { permission } : undefined);
    this.name = "PermissionDenied";
  }
}

export class TenantMismatch extends AppError {
  constructor() {
    super("tenant_mismatch", "The requested resource does not belong to your active organization");
    this.name = "TenantMismatch";
  }
}

export class NoActiveOrganization extends AppError {
  constructor() {
    super("no_active_organization", "No active organization on this session");
    this.name = "NoActiveOrganization";
  }
}

export class NotFound extends AppError {
  constructor(what: string) {
    super("resource_not_found", `${what} was not found`, { what });
    this.name = "NotFound";
  }
}

export class StateConflict extends AppError {
  constructor(message: string, extras?: Record<string, unknown>) {
    super("state_conflict", message, extras);
    this.name = "StateConflict";
  }
}

export class IdpUnavailable extends AppError {
  constructor(message = "The identity provider is currently unreachable") {
    super("idp_unavailable", message);
    this.name = "IdpUnavailable";
  }
}