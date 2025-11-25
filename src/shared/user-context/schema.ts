/**
 * User Context Schema
 *
 * Defines the structure of user context data
 */

import { z } from 'zod';

/**
 * User preferences schema
 */
export const UserPreferencesSchema = z.object({
  /** User's preferred language/locale */
  language: z.string().default('en'),
  /** User's timezone */
  timezone: z.string().default('UTC'),
  /** User's preferred date format */
  dateFormat: z.string().default('YYYY-MM-DD'),
  /** Enable verbose logging */
  verboseLogging: z.boolean().default(false)
});

/**
 * Project context schema
 */
export const ProjectContextSchema = z.object({
  /** Project name */
  name: z.string().optional(),
  /** Project description */
  description: z.string().optional(),
  /** Project root directory */
  rootDir: z.string(),
  /** Project type/framework */
  type: z.string().optional(),
  /** Custom metadata */
  metadata: z.record(z.unknown()).optional()
});

/**
 * Session context schema
 */
export const SessionContextSchema = z.object({
  /** Session ID */
  id: z.string(),
  /** Session start time */
  startedAt: z.string().datetime(),
  /** Current task/goal */
  currentTask: z.string().optional(),
  /** Session notes */
  notes: z.array(z.string()).default([]),
  /** Custom session data */
  data: z.record(z.unknown()).optional()
});

/**
 * Full user context schema
 */
export const UserContextSchema = z.object({
  /** User preferences */
  preferences: UserPreferencesSchema,
  /** Project context */
  project: ProjectContextSchema,
  /** Session context */
  session: SessionContextSchema.optional(),
  /** Last updated timestamp */
  updatedAt: z.string().datetime(),
  /** Schema version */
  version: z.string().default('1.0.0')
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type ProjectContext = z.infer<typeof ProjectContextSchema>;
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
