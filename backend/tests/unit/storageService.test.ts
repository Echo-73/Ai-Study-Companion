import fs from 'fs';
import path from 'path';
import { StorageService, storageService } from '../../src/services/storageService';
import { MaterialController } from '../../src/controllers/materialController';
import { materialService } from '../../src/services/materialService';

describe('StorageService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return "local" and allow storage in development mode by default', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.STORAGE_PROVIDER;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('local');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('should return "local" and allow storage in test mode by default', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.STORAGE_PROVIDER;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('local');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('should return "disabled" and disallow uploads in production mode when S3 is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('disabled');
    expect(service.isPersistentStorageConfigured()).toBe(false);

    const status = service.getStorageStatus();
    expect(status.configured).toBe(false);
    expect(status.message).toContain('Missing S3 object storage environment variables');
  });

  it('Production + STORAGE_PROVIDER=local + no S3 config -> provider must be disabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.STORAGE_PROVIDER = 'local';
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('disabled');
    expect(service.isPersistentStorageConfigured()).toBe(false);
  });

  it('Production + valid S3 config -> provider must be s3', () => {
    process.env.NODE_ENV = 'production';
    process.env.S3_BUCKET = 'prod-study-bucket';
    process.env.S3_ACCESS_KEY_ID = 'test-access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';

    const service = new StorageService();
    expect(service.getStorageType()).toBe('s3');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('Development + STORAGE_PROVIDER=local -> provider must be local', () => {
    process.env.NODE_ENV = 'development';
    process.env.STORAGE_PROVIDER = 'local';
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    const service = new StorageService();
    expect(service.getStorageType()).toBe('local');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('Development + STORAGE_PROVIDER=s3 with valid S3 config -> provider must be s3', () => {
    process.env.NODE_ENV = 'development';
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_BUCKET = 'dev-s3-bucket';
    process.env.S3_ACCESS_KEY_ID = 'dev-access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'dev-secret-key';

    const service = new StorageService();
    expect(service.getStorageType()).toBe('s3');
    expect(service.isPersistentStorageConfigured()).toBe(true);
  });

  it('should save and retrieve files using local disk in local mode', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.S3_BUCKET;

    const service = new StorageService();
    const testContent = Buffer.from('test local pdf content');

    const saveResult = await service.saveFile({
      projectId: 'proj-123',
      originalName: 'test-document.pdf',
      buffer: testContent,
      mimeType: 'application/pdf',
    });

    expect(saveResult.provider).toBe('local');
    expect(fs.existsSync(saveResult.fileUrl)).toBe(true);

    const fetchedBuffer = await service.getFileBuffer(saveResult.fileUrl);
    expect(fetchedBuffer.equals(testContent)).toBe(true);

    // Clean up
    await service.deleteFile(saveResult.fileUrl);
    expect(fs.existsSync(saveResult.fileUrl)).toBe(false);
  });

  it('should upload to S3 and return a project-scoped key in S3 mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.S3_BUCKET = 'prod-study-bucket';
    process.env.S3_ACCESS_KEY_ID = 'test-access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';

    const service = new StorageService();
    const mockSend = jest.fn().mockResolvedValue({});
    service.setS3Client({ send: mockSend } as any);

    const testContent = Buffer.from('test s3 pdf content');
    const saveResult = await service.saveFile({
      projectId: 'proj-456',
      originalName: 'physics.pdf',
      buffer: testContent,
      mimeType: 'application/pdf',
    });

    expect(saveResult.provider).toBe('s3');
    expect(saveResult.fileUrl).toContain('projects/proj-456/materials/');
    expect(saveResult.fileUrl).toContain('physics.pdf');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should retrieve S3 file buffer in S3 mode', async () => {
    process.env.NODE_ENV = 'production';
    process.env.S3_BUCKET = 'prod-study-bucket';
    process.env.S3_ACCESS_KEY_ID = 'test-access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';

    const service = new StorageService();
    const fakeBytes = Uint8Array.from([10, 20, 30, 40]);
    const mockSend = jest.fn().mockResolvedValue({
      Body: {
        transformToByteArray: async () => fakeBytes,
      },
    });
    service.setS3Client({ send: mockSend } as any);

    const buffer = await service.getFileBuffer('projects/proj-456/materials/physics.pdf');
    expect(buffer).toEqual(Buffer.from(fakeBytes));
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should reject saveFile with 503 when storage is disabled', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;

    const service = new StorageService();
    await expect(
      service.saveFile({
        projectId: 'proj-789',
        originalName: 'test.pdf',
        buffer: Buffer.from('content'),
      })
    ).rejects.toThrow('Persistent PDF storage is not configured');
  });
});

describe('MaterialController upload cleanup on failure', () => {
  let controller: MaterialController;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new MaterialController();
    mockReq = {
      user: { userId: 'user-1' },
      params: { projectId: 'proj-1' },
      body: { title: 'Test Cleanup' },
      file: {
        originalname: 'test.pdf',
        buffer: Buffer.from('test pdf content'),
        mimetype: 'application/pdf',
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.restoreAllMocks();
  });

  it('successful upload -> no cleanup', async () => {
    jest.spyOn(storageService, 'getStorageStatus').mockReturnValue({ configured: true, provider: 's3' });
    jest.spyOn(storageService, 'saveFile').mockResolvedValue({
      fileUrl: 'projects/proj-1/materials/test.pdf',
      storageKey: 'projects/proj-1/materials/test.pdf',
      provider: 's3',
    });
    const deleteSpy = jest.spyOn(storageService, 'deleteFile').mockResolvedValue();
    jest.spyOn(materialService, 'uploadAndEnqueue').mockResolvedValue({
      material: { id: 'mat-1', title: 'Test Cleanup' } as any,
      jobId: 'job-1',
    });

    await controller.uploadMaterial(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(202);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('storage upload failure -> no cleanup', async () => {
    jest.spyOn(storageService, 'getStorageStatus').mockReturnValue({ configured: true, provider: 's3' });
    const s3Error = new Error('S3 PutObject failure');
    jest.spyOn(storageService, 'saveFile').mockRejectedValue(s3Error);
    const deleteSpy = jest.spyOn(storageService, 'deleteFile').mockResolvedValue();
    const enqueueSpy = jest.spyOn(materialService, 'uploadAndEnqueue');

    await controller.uploadMaterial(mockReq, mockRes, mockNext);

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(enqueueSpy).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(s3Error);
  });

  it('storage upload succeeds but material/job creation fails -> deleteFile is called', async () => {
    jest.spyOn(storageService, 'getStorageStatus').mockReturnValue({ configured: true, provider: 's3' });
    const uploadedUrl = 'projects/proj-1/materials/test.pdf';
    jest.spyOn(storageService, 'saveFile').mockResolvedValue({
      fileUrl: uploadedUrl,
      storageKey: uploadedUrl,
      provider: 's3',
    });
    const dbError = new Error('Database transaction failed');
    jest.spyOn(materialService, 'uploadAndEnqueue').mockRejectedValue(dbError);
    const deleteSpy = jest.spyOn(storageService, 'deleteFile').mockResolvedValue();

    await controller.uploadMaterial(mockReq, mockRes, mockNext);

    expect(deleteSpy).toHaveBeenCalledWith(uploadedUrl);
    expect(mockNext).toHaveBeenCalledWith(dbError);
  });

  it('deleteFile failure -> original error is still returned', async () => {
    jest.spyOn(storageService, 'getStorageStatus').mockReturnValue({ configured: true, provider: 's3' });
    const uploadedUrl = 'projects/proj-1/materials/test.pdf';
    jest.spyOn(storageService, 'saveFile').mockResolvedValue({
      fileUrl: uploadedUrl,
      storageKey: uploadedUrl,
      provider: 's3',
    });
    const dbError = new Error('Database constraint error');
    jest.spyOn(materialService, 'uploadAndEnqueue').mockRejectedValue(dbError);
    const cleanupError = new Error('S3 DeleteObject permission denied');
    const deleteSpy = jest.spyOn(storageService, 'deleteFile').mockRejectedValue(cleanupError);

    await controller.uploadMaterial(mockReq, mockRes, mockNext);

    expect(deleteSpy).toHaveBeenCalledWith(uploadedUrl);
    // Crucial: original error must not be masked by cleanup failure
    expect(mockNext).toHaveBeenCalledWith(dbError);
  });
});
