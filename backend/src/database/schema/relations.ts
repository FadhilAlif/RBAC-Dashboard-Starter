import { relations } from "drizzle-orm";
import { auditLogs } from "./audit-logs.js";
import { emailVerificationTokens } from "./email-verification-tokens.js";
import { notificationReads, notificationRoles, notifications } from "./notifications.js";
import { passwordResetTokens } from "./password-reset-tokens.js";
import { permissions } from "./permissions.js";
import { refreshTokens } from "./refresh-tokens.js";
import { rolePermissions } from "./role-permissions.js";
import { roles } from "./roles.js";
import { userRoles } from "./user-roles.js";
import { users } from "./users.js";

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  refreshTokens: many(refreshTokens),
  auditLogs: many(auditLogs),
  emailVerificationTokens: many(emailVerificationTokens),
  passwordResetTokens: many(passwordResetTokens),
  createdNotifications: many(notifications),
  notificationReads: many(notificationReads),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  notificationRoles: many(notificationRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  creator: one(users, {
    fields: [notifications.createdBy],
    references: [users.id],
  }),
  notificationRoles: many(notificationRoles),
  notificationReads: many(notificationReads),
}));

export const notificationRolesRelations = relations(notificationRoles, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationRoles.notificationId],
    references: [notifications.id],
  }),
  role: one(roles, {
    fields: [notificationRoles.roleId],
    references: [roles.id],
  }),
}));

export const notificationReadsRelations = relations(notificationReads, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationReads.notificationId],
    references: [notifications.id],
  }),
  user: one(users, {
    fields: [notificationReads.userId],
    references: [users.id],
  }),
}));
