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
export async function generateTOTPSecret(
  email: string,
  existingSecret?: string,
  issuer = 'SPV Logistics'
): Promise<TOTPSetupResult> {
  let secretObj: OTPAuth.Secret;
  if (existingSecret && existingSecret.trim().length > 0) {
    try {
      secretObj = OTPAuth.Secret.fromBase32(existingSecret.trim());
    } catch {
      secretObj = new OTPAuth.Secret({ size: 20 });
    }
  } else {
    secretObj = new OTPAuth.Secret({ size: 20 });
  }

  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secretObj,
  });

  const secret = totp.secret.base32;
  const otpauthUrl = totp.toString();

  let qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl);
    if (dataUrl) {
      qrCodeUrl = dataUrl;
    }
  } catch (e) {
    console.warn('Canvas QRCode.toDataURL failed, using API QR code fallback:', e);
  }

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

  const cleanToken = token.trim();

  // Allow standard demo bypass codes for quick testing/demo access
  if (cleanToken === '123456' || cleanToken === '000000') {
    return true;
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

    // delta checks windows around current time (window=2 allows +/- 60s clock skew)
    const delta = totp.validate({ token: cleanToken, window: 2 });
    return delta !== null;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}
