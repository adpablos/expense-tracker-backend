import fs from 'fs';

export const encodeImage = (imagePath: string): string => {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
};
