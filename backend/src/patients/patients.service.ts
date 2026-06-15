import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: QueryPatientsDto) {
    const { page = 1, limit = 10, search, sortBy = 'lastName', sortOrder = 'asc' } = q;
    const where: Prisma.PatientWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.patient.count({ where }),
    ]);
    return { data, page, limit, total };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }
    return patient;
  }

  async create(dto: CreatePatientDto) {
    try {
      return await this.prisma.patient.create({
        data: { ...dto, dob: new Date(dto.dob) },
      });
    } catch (error) {
      throw this.translatePrismaError(error);
    }
  }

  async update(id: string, dto: UpdatePatientDto) {
    // dob arrives as an optional ISO string; coerce to Date only when present.
    const data: Prisma.PatientUpdateInput = {
      ...dto,
      ...(dto.dob !== undefined ? { dob: new Date(dto.dob) } : {}),
    };
    try {
      return await this.prisma.patient.update({ where: { id }, data });
    } catch (error) {
      throw this.translatePrismaError(error, id);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.patient.delete({ where: { id } });
    } catch (error) {
      throw this.translatePrismaError(error, id);
    }
  }

  /**
   * Translate known Prisma errors into HTTP exceptions:
   * - P2002 (unique violation) → 409 Conflict (duplicate email).
   * - P2025 (record not found, on update/delete) → 404 Not Found.
   * Anything else is rethrown for the global filter to handle as a 500.
   */
  private translatePrismaError(error: unknown, id?: string): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('A patient with this email already exists');
      }
      if (error.code === 'P2025') {
        return new NotFoundException(id ? `Patient ${id} not found` : 'Patient not found');
      }
    }
    return error instanceof Error ? error : new Error('Unexpected error');
  }
}
