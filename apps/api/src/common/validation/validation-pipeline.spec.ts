import 'reflect-metadata';
import {
  Body,
  Controller,
  HttpException,
  Post,
  BadRequestException,
  UseInterceptors,
  type ArgumentsHost,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { IsEmail, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import request from 'supertest';
import { DatabaseError } from 'pg';
import type { ApiErrorResponse } from '@nuxion/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { createValidationPipe, flattenFieldErrors } from './create-validation-pipe';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
import { FileUploadErrorsInterceptor } from '../interceptors/file-upload-errors.interceptor';

class ContactDto {
  @IsEmail() email!: string;
}
class FormDto {
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts!: ContactDto[];
}
@Controller('form')
class FormController {
  @Post()
  submit(@Body() dto: FormDto) {
    return dto;
  }
  @Post('upload')
  @UseInterceptors(
    FileUploadErrorsInterceptor,
    FileInterceptor('file', { limits: { fileSize: 4 } }),
  )
  upload() {
    return {};
  }
}

function filterResponse(exception: unknown) {
  const json = vi.fn((body: ApiErrorResponse) => body);
  const status = vi.fn((_status: number) => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/api/form' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { body: json.mock.calls[0]?.[0], status: status.mock.calls[0]?.[0] };
}

describe('form validation error pipeline', () => {
  it('flattens constraint and array-child paths without including values', () => {
    const fields = flattenFieldErrors([
      {
        property: 'contacts',
        constraints: { required: 'Contacts required' },
        children: [
          {
            property: '0',
            children: [
              {
                property: 'email',
                value: 'secret',
                constraints: { isEmail: 'Invalid email' },
                children: [],
              },
            ],
          },
        ],
      },
    ]);
    expect(fields).toEqual({
      contacts: ['Contacts required'],
      'contacts.0.email': ['Invalid email'],
    });
    expect(JSON.stringify(fields)).not.toContain('secret');
  });

  it('returns structured validation through the real HTTP pipeline without a database', async () => {
    const module = await Test.createTestingModule({ controllers: [FormController] }).compile();
    const app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    try {
      const response = await request(app.getHttpServer())
        .post('/form')
        .send({
          contacts: [{ email: 'private-invalid-value' }],
          unexpected: 'private-extra-value',
        })
        .expect(400);
      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        path: '/form',
        fieldErrors: {
          unexpected: ['property unexpected should not exist'],
          'contacts.0.email': ['email must be an email'],
        },
      });
      expect(response.body.message).toEqual(expect.arrayContaining(['email must be an email']));
      expect(JSON.stringify(response.body)).not.toContain('private-');
      const uploadResponse = await request(app.getHttpServer())
        .post('/form/upload')
        .attach('file', Buffer.from('oversized'), 'file.txt')
        .expect(413);
      expect(uploadResponse.body.fieldErrors).toEqual({ file: ['File too large'] });
    } finally {
      await app.close();
    }
  });

  it('forwards only valid field message metadata and leaves general errors unattributed', () => {
    expect(
      filterResponse(
        new BadRequestException({
          message: 'Invalid',
          fieldErrors: {
            email: ['Email invalid'],
            name: 'not-an-array',
            token: [42],
            'constructor.x': ['unsafe'],
          },
        }),
      ).body.fieldErrors,
    ).toEqual({ email: ['Email invalid'] });
    expect(filterResponse(new HttpException('Unavailable', 503)).body.fieldErrors).toBeUndefined();
  });

  it('attributes known public unique races and hides private constraint names', () => {
    const duplicate = (constraint: string) => {
      const error = new DatabaseError('duplicate detail', 0, 'error');
      error.code = '23505';
      error.constraint = constraint;
      return new Error('Query failed', { cause: error });
    };
    expect(filterResponse(duplicate('users_email_key'))).toMatchObject({
      status: 409,
      body: { fieldErrors: { email: ['Unique constraint failed on: email'] } },
    });
    expect(filterResponse(duplicate('roles_name_key')).body.fieldErrors).toEqual({
      name: ['Unique constraint failed on: name'],
    });
    const privateError = filterResponse(duplicate('refresh_tokens_tokenHash_key')).body;
    expect(privateError.message).toBe('Unique constraint failed');
    expect(privateError.fieldErrors).toBeUndefined();
    expect(JSON.stringify(privateError)).not.toContain('tokenHash');
  });
});
