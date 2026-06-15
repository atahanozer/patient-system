import { ConflictException, NotFoundException } from '@nestjs/common';
import { Patient, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

const patient: Patient = {
  id: 'p-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@demo.health',
  phoneNumber: '+1555000111',
  dob: new Date('1990-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** Build a P2002 (unique constraint) Prisma error, as thrown on duplicate email. */
const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['email'] },
  });

/** Build a P2025 (record not found) Prisma error, as thrown by update/delete on a missing row. */
const p2025 = () =>
  new Prisma.PrismaClientKnownRequestError('Record to update not found', {
    code: 'P2025',
    clientVersion: 'test',
  });

interface PrismaMock {
  patient: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
}

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      patient: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      // The service passes an array of query promises; resolve them to a [data, total] tuple.
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new PatientsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('applies defaults (page 1, limit 10, sort lastName asc) with no search', async () => {
      prisma.patient.findMany.mockResolvedValue([patient]);
      prisma.patient.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { lastName: 'asc' },
      });
      expect(prisma.patient.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({ data: [patient], page: 1, limit: 10, total: 1 });
    });

    it('builds a case-insensitive OR filter and paginates for a custom query', async () => {
      prisma.patient.findMany.mockResolvedValue([patient]);
      prisma.patient.count.mockResolvedValue(42);

      const result = await service.findAll({
        page: 3,
        limit: 5,
        search: 'lov',
        sortBy: 'firstName',
        sortOrder: 'desc',
      });

      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: 'lov', mode: 'insensitive' } },
            { lastName: { contains: 'lov', mode: 'insensitive' } },
            { email: { contains: 'lov', mode: 'insensitive' } },
          ],
        },
        skip: 10, // (3 - 1) * 5
        take: 5,
        orderBy: { firstName: 'desc' },
      });
      expect(result).toEqual({ data: [patient], page: 3, limit: 5, total: 42 });
    });
  });

  describe('findOne', () => {
    it('returns the patient when found', async () => {
      prisma.patient.findUnique.mockResolvedValue(patient);

      await expect(service.findOne('p-1')).resolves.toEqual(patient);
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { id: 'p-1' } });
    });

    it('throws NotFoundException when missing', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreatePatientDto = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@demo.health',
      phoneNumber: '+1555000111',
      dob: '1990-01-01',
    };

    it('persists with dob coerced to a Date and returns the row', async () => {
      prisma.patient.create.mockResolvedValue(patient);

      const result = await service.create(dto);

      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@demo.health',
          phoneNumber: '+1555000111',
          dob: new Date('1990-01-01'),
        },
      });
      expect(result).toEqual(patient);
    });

    it('maps a P2002 unique violation to ConflictException', async () => {
      prisma.patient.create.mockRejectedValue(p2002());

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    const dto: UpdatePatientDto = { firstName: 'Grace' };

    it('updates and returns the row', async () => {
      prisma.patient.update.mockResolvedValue({ ...patient, firstName: 'Grace' });

      const result = await service.update('p-1', dto);

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { firstName: 'Grace' },
      });
      expect(result.firstName).toBe('Grace');
    });

    it('coerces dob to a Date when present', async () => {
      prisma.patient.update.mockResolvedValue(patient);

      await service.update('p-1', { dob: '2000-12-31' });

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { dob: new Date('2000-12-31') },
      });
    });

    it('throws NotFoundException when the row is missing (P2025)', async () => {
      prisma.patient.update.mockRejectedValue(p2025());

      await expect(service.update('nope', dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps a P2002 unique violation to ConflictException', async () => {
      prisma.patient.update.mockRejectedValue(p2002());

      await expect(service.update('p-1', { email: 'taken@demo.health' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the row by id', async () => {
      prisma.patient.delete.mockResolvedValue(patient);

      await service.remove('p-1');

      expect(prisma.patient.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
    });

    it('throws NotFoundException when the row is missing (P2025)', async () => {
      prisma.patient.delete.mockRejectedValue(p2025());

      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
