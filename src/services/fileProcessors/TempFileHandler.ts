// src/services/fileHandlers/TempFileHandler.ts
import fs from 'fs';
import path from 'path';

import { injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class TempFileHandler {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(__dirname, '../../../tmp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public createTempFile(buffer: Buffer, originalName: string): string {
    const tempPath = path.join(this.tempDir, `${uuidv4()}${path.extname(originalName)}`);
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
  }

  public deleteTempFiles(paths: string[]): void {
    paths.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Log the error but don't throw to avoid interrupting the cleanup process
        console.error(`Error deleting file ${filePath}:`, error);
      }
    });
  }
}
