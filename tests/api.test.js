const request = require('supertest');

// Mock mongoose to avoid needing a real DB connection during tests
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({ connection: { host: 'mockhost' } })
  };
});

let server;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'testsecret';
  server = require('../src/index');
});

afterAll((done) => {
  server.close(done);
});

describe('Health Check', () => {
  it('GET / should return API info', async () => {
    const res = await request(server).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(server).get('/api/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth Routes', () => {
  it('POST /api/auth/login should fail with missing fields', async () => {
    const res = await request(server).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should fail without token', async () => {
    const res = await request(server).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
