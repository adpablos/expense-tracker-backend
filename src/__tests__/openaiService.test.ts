import { transcribeAudio } from '../external/openaiService';
import path from 'path';

describe('openaiService', () => {
    it('transcribeAudio should throw for missing file', async () => {
        await expect(transcribeAudio('nonexistent.wav')).rejects.toThrow('Invalid or empty audio file');
    });

    it('transcribeAudio should throw for empty file', async () => {
        const emptyFile = path.join(__dirname, 'fixtures', 'empty.wav');
        await expect(transcribeAudio(emptyFile)).rejects.toThrow('Invalid or empty audio file');
    });
});
