import fs from 'fs';

import { encodeImage } from '../../src/utils/encodeImage';

jest.mock('fs');

describe('encodeImage', () => {
  const mockImagePath = '/path/to/image.png';
  const mockImageBuffer = Buffer.from('mock image data');
  const mockBase64String = mockImageBuffer.toString('base64');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should encode an image correctly to base64', () => {
    // Mock fs.readFileSync to return a mock image buffer
    (fs.readFileSync as jest.Mock).mockReturnValue(mockImageBuffer);

    const result = encodeImage(mockImagePath);

    expect(fs.readFileSync).toHaveBeenCalledWith(mockImagePath);
    expect(result).toBe(mockBase64String);
  });

  it('should throw an error if fs.readFileSync fails', () => {
    // Mock fs.readFileSync to throw an error
    const mockError = new Error('File not found');
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw mockError;
    });

    expect(() => encodeImage(mockImagePath)).toThrow('File not found');
  });
});
