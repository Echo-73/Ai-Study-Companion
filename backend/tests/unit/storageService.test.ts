import { StorageService } from '../../src/services/storageService';

describe('StorageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return "local" and allow storage in development mode', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.S3_BUCKET;
    delete process.env.STORAGE_PROVIDER;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('local');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('should return "local" and allow storage in test mode', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.S3_BUCKET;
    delete process.env.STORAGE_PROVIDER;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('local');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('should return "disabled" and disallow uploads in production mode', () => {
    process.env.NODE_ENV = 'production';

    const service = new StorageService();
    expect(service.getStorageType()).toBe('disabled');
    expect(service.isPersistentStorageConfigured()).toBe(false);
  });
});

