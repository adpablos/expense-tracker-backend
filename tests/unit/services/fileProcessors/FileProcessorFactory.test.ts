import 'reflect-metadata';
import { Container } from 'inversify';

import { AudioProcessor } from '../../../../src/services/fileProcessors/AudioProcessor';
import { FileProcessorFactory } from '../../../../src/services/fileProcessors/FileProcessorFactory';
import { ImageProcessor } from '../../../../src/services/fileProcessors/ImageProcessor';
import { DI_TYPES } from '../../../../src/types/di';
import { AppError } from '../../../../src/utils/AppError';
import { createTestContainer } from '../../../testContainer';

describe('FileProcessorFactory', () => {
  let container: Container;
  let fileProcessorFactory: FileProcessorFactory;
  let mockImageProcessor: ImageProcessor;
  let mockAudioProcessor: AudioProcessor;

  beforeEach(() => {
    container = createTestContainer({ mockServices: true });
    mockImageProcessor = { process: jest.fn() } as unknown as ImageProcessor;
    mockAudioProcessor = { process: jest.fn() } as unknown as AudioProcessor;

    // Bind FileProcessor services
    container
      .bind<ImageProcessor>(DI_TYPES.FileProcessor)
      .toConstantValue(mockImageProcessor)
      .whenTargetNamed('ImageProcessor');
    container
      .bind<AudioProcessor>(DI_TYPES.FileProcessor)
      .toConstantValue(mockAudioProcessor)
      .whenTargetNamed('AudioProcessor');

    // Bind FileProcessorFactory
    container.bind<FileProcessorFactory>(FileProcessorFactory).toSelf();

    fileProcessorFactory = container.get<FileProcessorFactory>(FileProcessorFactory);
  });

  it('should return ImageProcessor for image mimetypes', () => {
    const file = { mimetype: 'image/jpeg' } as Express.Multer.File;
    const processor = fileProcessorFactory.getProcessor(file);
    expect(processor).toBe(mockImageProcessor);
  });

  it('should return AudioProcessor for audio mimetypes', () => {
    const file = { mimetype: 'audio/mpeg' } as Express.Multer.File;
    const processor = fileProcessorFactory.getProcessor(file);
    expect(processor).toBe(mockAudioProcessor);
  });

  it('should throw AppError for unsupported mimetypes', () => {
    const file = { mimetype: 'application/pdf' } as Express.Multer.File;
    expect(() => fileProcessorFactory.getProcessor(file)).toThrow(AppError);
    expect(() => fileProcessorFactory.getProcessor(file)).toThrow('Unsupported file type');
  });
});
