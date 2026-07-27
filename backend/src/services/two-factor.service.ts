/**
 * 双因素认证（2FA）服务
 *
 * 基于 TOTP（Time-based One-Time Password，RFC 6238）标准实现的
 * 双因素认证服务。提供密钥生成、TOTP 验证码生成与验证、备份恢复码
 * 管理等功能，兼容 Google Authenticator 和 Authy 等标准认证器应用。
 *
 * @module two-factor.service
 */

import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';

/**
 * TOTP（Time-based One-Time Password）双因素认证服务
 * 基于 RFC 6238 标准实现
 */
export class TwoFactorService {
  /**
   * 解码 Base32 字符串为 Buffer
   *
   * 将 RFC 4648 Base32 编码的字符串解码为二进制 Buffer，
   * 用于解析用户共享密钥。
   *
   * @param base32 - Base32 编码的字符串
   * @returns 解码后的二进制数据
   */
  private base32Decode(base32: string): Buffer {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.replace(/[=]/g, '').toUpperCase();
    const bits: number[] = [];

    for (const char of cleaned) {
      const idx = base32Chars.indexOf(char);
      if (idx === -1) continue;
      for (let i = 4; i >= 0; i--) {
        bits.push((idx >> i) & 1);
      }
    }

    const bytes: number[] = [];
    for (let i = 0; i + 7 < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | bits[i + j];
      }
      bytes.push(byte);
    }

    return Buffer.from(bytes);
  }

  /**
   * 编码 Buffer 为 Base32 字符串
   *
   * 将二进制数据编码为 RFC 4648 Base32 格式的字符串，
   * 用于生成用户可读的共享密钥。
   *
   * @param buffer - 要编码的二进制数据
   * @returns Base32 编码的字符串（含必要填充）
   */
  private base32Encode(buffer: Buffer): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits: number[] = [];

    for (const byte of buffer) {
      for (let i = 7; i >= 0; i--) {
        bits.push((byte >> i) & 1);
      }
    }

    let result = '';
    for (let i = 0; i + 4 < bits.length; i += 5) {
      let idx = 0;
      for (let j = 0; j < 5; j++) {
        idx = (idx << 1) | (bits[i + j] || 0);
      }
      result += base32Chars[idx];
    }

    // 填充
    const padLength = (8 - (result.length % 8)) % 8;
    result += '='.repeat(padLength);

    return result;
  }

  /**
   * 动态截断 HMAC 结果
   *
   * 根据 RFC 4226（HOTP）规范，对 HMAC-SHA1 结果进行动态截断，
   * 提取 31 位整数作为 TOTP 验证码的基础值。
   *
   * @param hmacResult - HMAC-SHA1 计算结果的 Buffer
   * @returns 动态截断后的 31 位整数
   */
  private dynamicTruncation(hmacResult: Buffer): number {
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);
    return code;
  }

  /**
   * 生成 TOTP 验证码
   * @param secret Base32 编码的密钥
   * @param timestamp 时间戳（默认当前时间）
   * @param digits 验证码位数（默认6位）
   * @param period 时间步长（默认30秒）
   */
  generateTOTP(
    secret: string,
    timestamp: number = Date.now(),
    digits: number = 6,
    period: number = 30
  ): string {
    const counter = Math.floor(timestamp / 1000 / period);

    // 将计数器编码为 8 字节大端序 Buffer
    const counterBuffer = Buffer.alloc(8);
    let temp = counter;
    for (let i = 7; i >= 0; i--) {
      counterBuffer[i] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }

    const key = this.base32Decode(secret);
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    const code = this.dynamicTruncation(hmacResult);
    const totpCode = code % Math.pow(10, digits);

    return totpCode.toString().padStart(digits, '0');
  }

  /**
   * 验证 TOTP 验证码
   * @param token 用户输入的验证码
   * @param secret Base32 编码的密钥
   * @param window 允许的时间窗口偏差（步数）
   */
  verifyTOTP(
    token: string,
    secret: string,
    window: number = 1
  ): boolean {
    const now = Date.now();
    const period = 30; // 30秒步长

    // 在当前时间窗口前后 window 个步长内验证
    for (let i = -window; i <= window; i++) {
      const generated = this.generateTOTP(
        secret,
        now + i * period * 1000,
        6,
        period
      );
      // 使用恒定时间比较防止时序攻击
      if (this.constantTimeCompare(token, generated)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 恒定时间比较，防止时序攻击
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // 不要提前返回 - 用比较时间混淆
      let result = 0;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        result |= 0;
      }
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * 生成共享密钥
   */
  generateSecret(): string {
    const buffer = crypto.randomBytes(20); // 160 bits
    return this.base32Encode(buffer);
  }

  /**
   * 生成备份恢复码
   * @param count 生成数量
   */
  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * 验证备份恢复码
   * @param code 用户输入的恢复码
   * @param backupCodes 已存储的备份码列表
   */
  verifyBackupCode(code: string, backupCodes: string[]): boolean {
    return backupCodes.some(
      (storedCode) => storedCode.toUpperCase() === code.toUpperCase()
    );
  }

  /**
   * 更新备份码列表（移除已使用的码）
   */
  removeUsedBackupCode(code: string, backupCodes: string[]): string[] {
    return backupCodes.filter(
      (storedCode) => storedCode.toUpperCase() !== code.toUpperCase()
    );
  }

  /**
   * 生成用于 Google Authenticator / Authy 的 otpauth URI
   */
  generateOTPAuthURI(
    secret: string,
    accountName: string,
    issuer: string = 'GameHub'
  ): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }
}

export const twoFactorService = new TwoFactorService();
export default twoFactorService;
