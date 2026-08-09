import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export interface TOTPSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
}

/**
 * Generate a new TOTP secret and QR code URL for Google Authenticator.
 */
export async function generateTOTPSecret(email: string, issuer = 'SPV Logistics'): Promise<TOTPSetupResult> {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secret = totp.secret.base32;
  const otpauthUrl = totp.toString();
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    secret,
    otpauthUrl,
    qrCodeUrl,
  };
}

/**
 * Verify a 6-digit TOTP token against a base32 secret.
 */
export function verifyTOTPToken(token: string, secret: string, email = 'user'): boolean {
  if (!token || token.trim().length !== 6 || !secret) {
    return false;
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'SPV Logistics',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // delta checks windows around current time (default window is 1 step = +/-30s)
    const delta = totp.validate({ token: token.trim(), window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}
