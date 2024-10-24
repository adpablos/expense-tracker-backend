import 'reflect-metadata';
import { Container } from 'inversify';

import { DI_TYPES } from '../../../../src/config/di';
import { AudioProcessor } from '../../../../src/services/fileProcessors/AudioProcessor';
import { FileProcessorFactory } from '../../../../src/services/fileProcessors/FileProcessorFactory';
import { ImageProcessor } from '../../../../src/services/fileProcessors/ImageProcessor';
import { AppError } from '../../../../src/utils/AppError';
import { createUnitTestContainer } from '../../../config/testContainers';

describe('FileProcessorFactory', () => {
  let container: Container;
  let fileProcessorFactory: FileProcessorFactory;
  let mockImageProcessor: ImageProcessor;
  let mockAudioProcessor: AudioProcessor;

  beforeEach(() => {
    // Cambio principal: usar el nuevo contenedor
    container = createUnitTestContainer({ mockServices: true });
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
