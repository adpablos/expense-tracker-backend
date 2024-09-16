// tests/unit/services/fileProcessors/AudioConverter.test.ts
import 'reflect-metadata';
import ffmpeg from 'fluent-ffmpeg';

import logger from '../../../../src/config/logger';
import { AudioConverter } from '../../../../src/services/fileProcessors/AudioConverter';
import { AppError } from '../../../../src/utils/AppError';

// Define the interface for the mock ffmpeg instance
interface FfmpegInstanceMock {
  toFormat: jest.Mock;
  on: jest.Mock;
  save: jest.Mock;
}

// Mock 'fluent-ffmpeg'
jest.mock('fluent-ffmpeg', () => {
  const ffprobe = jest.fn();

  const ffmpegMock = jest.fn(() => ({
    toFormat: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
      if (event === 'end') callback();
      return mockFfmpegInstance;
    }),
    save: jest.fn(),
  }));

  const mockFfmpegInstance: FfmpegInstanceMock = {
    toFormat: jest.fn(),
    on: jest.fn(),
    save: jest.fn(),
  };

  // Add 'ffprobe' as a property of the mock
  Object.assign(ffmpegMock, { ffprobe });

  return ffmpegMock;
});

// Cast 'ffmpeg' as a mock with 'ffprobe' additional
const mockedFfmpeg = ffmpeg as unknown as jest.Mock & { ffprobe: jest.Mock };

jest.mock('../../../../src/config/logger');

const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('AudioConverter', () => {
  let audioConverter: AudioConverter;

  beforeEach(() => {
    audioConverter = new AudioConverter();
    jest.resetAllMocks();
  });

  it('should verify a valid audio file', async () => {
    // Configure the mock of ffprobe to resolve correctly
    mockedFfmpeg.ffprobe.mockImplementation(
      (path: string, callback: (error: Error | null, data?: unknown) => void) => {
        callback(null, {});
      }
    );

    await expect(audioConverter.verifyAudio('/path/to/valid/audio.mp3')).resolves.toBeUndefined();
    expect(mockedFfmpeg.ffprobe).toHaveBeenCalledWith(
      '/path/to/valid/audio.mp3',
      expect.any(Function)
    );
  });

  it('should throw AppError for invalid audio file', async () => {
    // Configure the mock of ffprobe to reject with an error
    mockedFfmpeg.ffprobe.mockImplementation(
      (path: string, callback: (error: Error | null, data?: unknown) => void) => {
        callback(new Error('Invalid audio'), null);
      }
    );

    await expect(audioConverter.verifyAudio('/path/to/invalid/audio.mp3')).rejects.toThrow(
      AppError
    );
    await expect(audioConverter.verifyAudio('/path/to/invalid/audio.mp3')).rejects.toThrow(
      'Invalid audio file.'
    );
    expect(mockedLogger.error).toHaveBeenCalledWith('Invalid audio file:', expect.any(Error));
  });

  it('should convert audio to WAV successfully', async () => {
    // Create a mock ffmpeg instance
    const mockFfmpegInstance: FfmpegInstanceMock = {
      toFormat: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
        if (event === 'end') callback();
        return mockFfmpegInstance;
      }),
      save: jest.fn(),
    };

    // Configure the mock of ffmpeg to return the mock instance
    mockedFfmpeg.mockImplementation(() => mockFfmpegInstance);

    await expect(audioConverter.convertToWav('/path/to/audio.mp3')).resolves.toBe(
      '/path/to/audio.mp3.wav'
    );
    expect(mockedFfmpeg).toHaveBeenCalledWith('/path/to/audio.mp3');
    expect(mockFfmpegInstance.toFormat).toHaveBeenCalledWith('wav');
    expect(mockFfmpegInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockFfmpegInstance.on).toHaveBeenCalledWith('end', expect.any(Function));
    expect(mockFfmpegInstance.save).toHaveBeenCalledWith('/path/to/audio.mp3.wav');
  });

  it('should throw AppError if conversion fails', async () => {
    // Create a mock ffmpeg instance that simulates a conversion error
    const mockFfmpegInstance: FfmpegInstanceMock = {
      toFormat: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
        if (event === 'error') callback(new Error('Conversion failed'));
        return mockFfmpegInstance;
      }),
      save: jest.fn(),
    };

    // Configure the mock of ffmpeg to return the mock instance with error
    mockedFfmpeg.mockImplementation(() => mockFfmpegInstance);

    await expect(audioConverter.convertToWav('/path/to/audio.mp3')).rejects.toThrow(AppError);
    await expect(audioConverter.convertToWav('/path/to/audio.mp3')).rejects.toThrow(
      'Error converting audio file.'
    );
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Error during audio conversion to WAV:',
      expect.any(Error)
    );
  });
});
