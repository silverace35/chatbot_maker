import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const stat = promisify(fs.stat);

/**
 * Service for managing file storage on disk
 * Files are organized by profile: data/profiles/<profileId>/raw/
 */
class FileStorageService {
  private readonly baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'data', 'profiles')) {
    this.baseDir = baseDir;
  }

  /**
   * Get the directory path for a profile's raw files
   */
  getProfileRawDir(profileId: string): string {
    return path.join(this.baseDir, profileId, 'raw');
  }

  /**
   * Get the directory path for a profile's chunks (if needed)
   */
  getProfileChunksDir(profileId: string): string {
    return path.join(this.baseDir, profileId, 'chunks');
  }

  /**
   * Ensure directory exists, create if not
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await stat(dirPath);
    } catch (error) {
      // Directory doesn't exist, create it
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Store a file for a profile
   * @returns The relative path where the file was stored
   */
  async storeFile(profileId: string, filename: string, content: Buffer | string): Promise<string> {
    const rawDir = this.getProfileRawDir(profileId);
    await this.ensureDir(rawDir);

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(rawDir, sanitizedFilename);

    await writeFile(filePath, content);

    // Return relative path from baseDir
    return path.relative(this.baseDir, filePath);
  }

  /**
   * Read a file
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, relativePath);
    return await readFile(fullPath);
  }

  /**
   * Read file as text
   */
  async readFileAsText(relativePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const buffer = await this.readFile(relativePath);
    return buffer.toString(encoding);
  }

  /**
   * Delete a file
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    try {
      await unlink(fullPath);
    } catch (error) {
      console.error(`Failed to delete file ${fullPath}:`, error);
    }
  }

  /**
   * Delete all files for a profile
   */
  async deleteProfileFiles(profileId: string): Promise<void> {
    const profileDir = path.join(this.baseDir, profileId);
    try {
      // This is a simple implementation - in production you'd want recursive deletion
      const rawDir = this.getProfileRawDir(profileId);
      const files = fs.readdirSync(rawDir);
      for (const file of files) {
        await unlink(path.join(rawDir, file));
      }
      await rmdir(rawDir);
      await rmdir(profileDir);
    } catch (error) {
      console.error(`Failed to delete profile files for ${profileId}:`, error);
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(relativePath: string): Promise<fs.Stats> {
    const fullPath = path.join(this.baseDir, relativePath);
    return await stat(fullPath);
  }
}

export const fileStorageService = new FileStorageService();
