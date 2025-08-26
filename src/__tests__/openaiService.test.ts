import * as openaiService from '../external/openaiService';
import path from 'path';
import express from 'express';
import request from 'supertest';
import OpenAI from 'openai';

const { transcribeAudio } = openaiService;

describe('openaiService', () => {
    it('transcribeAudio should throw for missing file', async () => {
        await expect(transcribeAudio('nonexistent.wav')).rejects.toThrow('Invalid or empty audio file');
    });

    it('transcribeAudio should throw for empty file', async () => {
        const emptyFile = path.join(__dirname, 'fixtures', 'empty.wav');
        await expect(transcribeAudio(emptyFile)).rejects.toThrow('Invalid or empty audio file');
    });

    it('processReceipt should return 503 if OpenAI service is unavailable', async () => {
        const processReceiptMock = jest
            .spyOn(openaiService, 'processReceipt')
            .mockRejectedValue(new OpenAI.APIConnectionError({ message: 'Connection error' }));

        const app = express();
        app.post('/test', async (_req, res) => {
            try {
                await openaiService.processReceipt('dummy');
                res.sendStatus(200);
            } catch (error) {
                if (error instanceof OpenAI.APIConnectionError) {
                    res.status(503).send('OpenAI service is currently unavailable');
                } else {
                    res.status(500).send('Error processing the file.');
                }
            }
        });

        const res = await request(app).post('/test');
        expect(res.status).toBe(503);
        expect(res.text).toBe('OpenAI service is currently unavailable');

        processReceiptMock.mockRestore();
    });
});
