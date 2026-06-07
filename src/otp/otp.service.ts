import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from 'redis';

import { SendOtpDto, VerifyOtpDto } from './otp.dto';

@Injectable()
export class OtpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private readonly redis = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });

  constructor() {
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });
  }

  async onModuleInit() {
    if (!this.redis.isOpen) {
      await this.redis.connect();
    }
  }

  async onModuleDestroy() {
    if (this.redis.isOpen) {
      await this.redis.quit();
    }
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const identifier = this.normalizeIdentifier(sendOtpDto.identifier);
    const otp = this.generateOtp();
    const ttlSeconds = this.getOtpTtlSeconds();

    await this.redis.setEx(this.getOtpKey(identifier), ttlSeconds, otp);

    return {
      identifier,
      otp,
      expiresInSeconds: ttlSeconds,
      message: 'OTP generated successfully.',
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const identifier = this.normalizeIdentifier(verifyOtpDto.identifier);
    const otp = this.normalizeOtp(verifyOtpDto.otp);
    const otpKey = this.getOtpKey(identifier);
    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found.');
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    //do other verification logic here (e.g. mark user as verified, etc.)

    await this.redis.del(otpKey);

    return {
      verified: true,
      message: 'OTP verified successfully.',
    };
  }

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpKey(identifier: string) {
    return `otp:${identifier}`;
  }

  private getOtpTtlSeconds() {
    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? 300);

    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new BadRequestException(
        'OTP_TTL_SECONDS must be a positive number.',
      );
    }

    return ttlSeconds;
  }

  private normalizeIdentifier(identifier: string) {
    if (typeof identifier !== 'string' || identifier.trim().length === 0) {
      throw new BadRequestException('identifier is required.');
    }

    return identifier.trim().toLowerCase();
  }

  private normalizeOtp(otp: string) {
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      throw new BadRequestException('otp must be a 6 digit number.');
    }

    return otp.trim();
  }
}
