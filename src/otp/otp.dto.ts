export class SendOtpDto {
  identifier: string;
}

export class VerifyOtpDto {
  identifier: string;
  otp: string;
}
