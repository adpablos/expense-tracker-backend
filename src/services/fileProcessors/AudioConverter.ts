// src/services/audio/AudioConverter.ts
import { promisify } from 'util';

import ffmpeg from 'fluent-ffmpeg';
import { injectable } from 'inversify';

import logger from '../../config/logger';
import { AppError } from '../../utils/AppError';

const ffprobe = promisify(ffmpeg.ffprobe);

@injectable()
export class AudioConverter {
  public async verifyAudio(filePath: string): Promise<void> {
    try {
      await ffprobe(filePath);
    } catch (error) {
      logger.error('Invalid audio file:', error);
      throw new AppError('Invalid audio file.', 400);
    }
  }

  public async convertToWav(sourcePath: string): Promise<string> {
    const wavFilePath = `${sourcePath}.wav`;
    return new Promise<string>((resolve, reject) => {
      ffmpeg(sourcePath)
        .toFormat('wav')
        .on('error', (err) => {
          logger.error('Error during audio conversion to WAV:', err);
          reject(new AppError('Error converting audio file.', 500));
        })
        .on('end', () => resolve(wavFilePath))
        .save(wavFilePath);
    });
  }
}
