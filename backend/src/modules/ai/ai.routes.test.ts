import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./insights.service');
vi.mock('./chatbot.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import { generateInsights } from './insights.service';
import { answerChatbotQuery } from './chatbot.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);

describe('ai.routes (Supertest, mocked service)', () => {
  it('requires auth for insights', async () => {
    const res = await request(app).get('/api/ai/insights');
    expect(res.status).toBe(401);
  });

  it('returns rule-based insights', async () => {
    vi.mocked(generateInsights).mockResolvedValue([{ id: 'all-clear' }] as never);
    const res = await request(app).get('/api/ai/insights').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects an empty chatbot message (400)', async () => {
    const res = await request(app).post('/api/ai/chatbot').set('Authorization', `Bearer ${FAN_TOKEN}`).send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('answers a chatbot query', async () => {
    vi.mocked(answerChatbotQuery).mockResolvedValue('The stadium has 4 gates.');
    const res = await request(app).post('/api/ai/chatbot').set('Authorization', `Bearer ${FAN_TOKEN}`).send({ message: 'where are the gates?' });
    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBe('The stadium has 4 gates.');
  });
});
