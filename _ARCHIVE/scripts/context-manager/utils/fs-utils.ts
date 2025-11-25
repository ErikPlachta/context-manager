import { promises as fs } from "fs";
import path from "path";

export const ensureDir = async (targetDir: string): Promise<void> => {
  await fs.mkdir(targetDir, { recursive: true });
};

export const readFileSafe = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    return "";
  }
};

export const writeFileSafe = async (filePath: string, contents: string): Promise<void> => {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, contents, "utf8");
};

export const copyFileSafe = async (source: string, destination: string): Promise<void> => {
  const dir = path.dirname(destination);
  await ensureDir(dir);
  await fs.copyFile(source, destination);
};

export const listDirectory = async (dir: string): Promise<string[]> => {
  try {
    return await fs.readdir(dir);
  } catch (error) {
    return [];
  }
};
