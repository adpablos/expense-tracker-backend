// tests/unit/services/fileHandlers/TempFileHandler.test.ts
import 'reflect-metadata';
import fs from 'fs';
import path from 'path';

import { TempFileHandler } from '../../../../src/services/fileProcessors/TempFileHandler';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('TempFileHandler', () => {
  let tempFileHandler: TempFileHandler;
  const tempDir = path.join(__dirname, '../../../../tmp');

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    tempFileHandler = new TempFileHandler();
  });

  it('should create a temporary file from buffer', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const buffer = Buffer.from('test content');
    const originalName = 'test.mp3';

    const tempPath = tempFileHandler.createTempFile(buffer, originalName);

    expect(fs.writeFileSync).toHaveBeenCalledWith(tempPath, buffer);
    expect(tempPath).toMatch(new RegExp(`${tempDir}/.+\\.mp3$`));
  });

  it('should create the temp directory if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const buffer = Buffer.from('test content');
    const originalName = 'test.mp3';

    tempFileHandler.createTempFile(buffer, originalName);

    expect(fs.mkdirSync).toHaveBeenCalledWith(tempDir, { recursive: true });
  });

  it('should delete temporary files', () => {
    const filePaths = [path.join(tempDir, 'file1.wav'), path.join(tempDir, 'file2.wav')];
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    tempFileHandler.deleteTempFiles(filePaths);

    filePaths.forEach((filePath) => {
      expect(fs.unlinkSync).toHaveBeenCalledWith(filePath);
    });
  });

  it('should handle errors during file deletion gracefully', () => {
    const filePaths = [path.join(tempDir, 'file1.wav'), path.join(tempDir, 'file2.wav')];
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.unlinkSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join(tempDir, 'file1.wav')) throw new Error('Delete error');
    });

    expect(() => tempFileHandler.deleteTempFiles(filePaths)).not.toThrow();
    expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(tempDir, 'file1.wav'));
    expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(tempDir, 'file2.wav'));
  });
});
