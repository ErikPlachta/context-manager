/**
 * File System Tool
 *
 * Safe file read/write operations with path validation and error handling.
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { dirname, resolve, normalize } from 'path';
import { constants } from 'fs';

/**
 * File read options
 */
export interface ReadFileOptions {
  /** File encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Throw error if file doesn't exist (default: true) */
  throwIfNotExists?: boolean;
}

/**
 * File write options
 */
export interface WriteFileOptions {
  /** File encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Create parent directories if they don't exist (default: true) */
  createDirs?: boolean;
}

/**
 * Safely read a file
 *
 * @param filePath - Absolute or relative path to file
 * @param options - Read options
 * @returns File contents as string
 * @throws Error if file doesn't exist and throwIfNotExists is true
 */
export async function safeReadFile(
  filePath: string,
  options: ReadFileOptions = {}
): Promise<string | null> {
  const { encoding = 'utf-8', throwIfNotExists = true } = options;

  try {
    const normalizedPath = normalize(filePath);
    const content = await readFile(normalizedPath, { encoding });
    return content;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      if (throwIfNotExists) {
        throw new Error(`File not found: ${filePath}`);
      }
      return null;
    }
    throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Safely write a file
 *
 * @param filePath - Absolute or relative path to file
 * @param content - Content to write
 * @param options - Write options
 * @throws Error if write fails
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<void> {
  const { encoding = 'utf-8', createDirs = true } = options;

  try {
    const normalizedPath = normalize(filePath);

    // Create parent directories if needed
    if (createDirs) {
      const dir = dirname(normalizedPath);
      await mkdir(dir, { recursive: true });
    }

    await writeFile(normalizedPath, content, { encoding });
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if file exists
 *
 * @param filePath - Path to check
 * @returns True if file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const normalizedPath = normalize(filePath);
    await access(normalizedPath, constants.F_OK | constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate path is within allowed directory
 *
 * @param filePath - Path to validate
 * @param allowedDir - Allowed base directory
 * @returns True if path is within allowed directory
 */
export function isPathAllowed(filePath: string, allowedDir: string): boolean {
  const normalizedPath = resolve(normalize(filePath));
  const normalizedAllowedDir = resolve(normalize(allowedDir));

  return normalizedPath.startsWith(normalizedAllowedDir);
}
