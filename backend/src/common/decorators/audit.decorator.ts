import { SetMetadata } from "@nestjs/common";

export const AUDIT_METADATA_KEY = "rbac:audit_log";

export interface AuditOptions {
  action: string;
  resourceType?: string;
  resourceIdParam?: string;
}

export type AuditMetadataInput = string | AuditOptions;

/**
 * Decorator declarative untuk menandai endpoint yang perlu dicatat di Audit Log secara otomatis.
 *
 * Contoh penggunaan:
 * @Audit('users:create')
 * @Audit({ action: 'users:update', resourceType: 'users', resourceIdParam: 'id' })
 */
export const Audit = (options: AuditMetadataInput) =>
  SetMetadata(AUDIT_METADATA_KEY, options);
