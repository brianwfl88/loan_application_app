import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@rhb/shared-types';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a new customer', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'newuser@rhb.com.my',
      fullName: 'New Customer',
      role: Role.CUSTOMER,
      createdAt: new Date(),
    });

    const result = await service.register({
      email: 'newuser@rhb.com.my',
      password: 'Password123!',
      fullName: 'New Customer',
    });

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.email).toBe('newuser@rhb.com.my');
  });

  it('should authenticate valid login', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@rhb.com.my',
      fullName: 'User One',
      role: Role.CUSTOMER,
      passwordHash,
      createdAt: new Date(),
    });

    const result = await service.login({
      email: 'user@rhb.com.my',
      password: 'Password123!',
    });

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.email).toBe('user@rhb.com.my');
  });
});
