import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OtpController } from './otp/otp.controller';
import { OtpService } from './otp/otp.service';

@Module({
  imports: [],
  controllers: [AppController, OtpController],
  providers: [AppService, OtpService],
})
export class AppModule {}
