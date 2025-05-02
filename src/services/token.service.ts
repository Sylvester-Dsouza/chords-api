import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService, CachePrefix } from './cache.service';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface TokenPayload {
  sub: string;
  email: string;
  role?: string;
  deviceId?: string;
  jti?: string; // JWT ID
  iat?: number; // Issued at
  exp?: number; // Expiration time
  tokenHash?: string; // Hash of the refresh token
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiration: number; // in seconds
  private readonly refreshTokenExpiration: number; // in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    // Get secrets from environment variables or use defaults for development
    this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'dev-access-token-secret';
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-token-secret';

    // Set token expiration times
    this.accessTokenExpiration = parseInt(process.env.ACCESS_TOKEN_EXPIRATION || '900', 10); // 15 minutes
    this.refreshTokenExpiration = parseInt(process.env.REFRESH_TOKEN_EXPIRATION || '2592000', 10); // 30 days

    if (process.env.NODE_ENV !== 'production' &&
        (this.accessTokenSecret === 'dev-access-token-secret' ||
         this.refreshTokenSecret === 'dev-refresh-token-secret')) {
      this.logger.warn('Using default token secrets. This is not secure for production!');
    }
  }

  /**
   * Generate access and refresh tokens for a user
   * @param userId User ID
   * @param email User email
   * @param role User role (optional)
   * @param deviceId Device ID (optional)
   * @returns Access and refresh tokens
   */
  async generateTokens(
    userId: string,
    email: string,
    role?: string,
    deviceId?: string,
  ): Promise<TokenResponse> {
    // Generate a unique JWT ID
    const jti = uuidv4();

    // Create token payload
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
      deviceId,
      jti,
    };

    // Generate access token
    const accessToken = this.generateAccessToken(payload);

    // Generate refresh token
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token in database
    await this.storeRefreshToken(userId, refreshToken, deviceId);

    // Cache the access token for quick validation
    await this.cacheAccessToken(jti, userId, this.accessTokenExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiration,
    };
  }

  /**
   * Generate an access token
   * @param payload Token payload
   * @returns Access token
   */
  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      payload,
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiration }
    );
  }

  /**
   * Generate a refresh token
   * @param payload Token payload
   * @returns Refresh token
   */
  private generateRefreshToken(payload: TokenPayload): string {
    // Create a hash of the refresh token for storage
    const tokenValue = uuidv4();

    // Create a hash of the token value for storage
    const hashedToken = this.hashToken(tokenValue);

    // Store the token value in the payload
    const refreshPayload = {
      ...payload,
      tokenHash: hashedToken,
    };

    // Sign the refresh token
    return jwt.sign(
      refreshPayload,
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiration }
    );
  }

  /**
   * Store a refresh token in the database
   * @param userId User ID
   * @param token Refresh token
   * @param deviceId Device ID (optional)
   */
  private async storeRefreshToken(
    userId: string,
    token: string,
    _deviceId?: string, // Prefix with underscore to indicate it's not used
  ): Promise<void> {
    try {
      // Decode the token to get the payload
      const decoded = jwt.decode(token) as TokenPayload;

      if (!decoded || !decoded.jti) {
        throw new Error('Invalid token payload');
      }

      // Extract the token hash from the payload
      const tokenHash = decoded.tokenHash || '';

      // Calculate expiration date
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiration * 1000);

      // Store the token in the database
      await this.prisma.refreshToken.create({
        data: {
          id: decoded.jti,
          token: tokenHash, // Store the hash, not the actual token
          customerId: userId,
          // Skip deviceInfo as it's not in the schema
          expiresAt,
          createdAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Error storing refresh token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cache an access token for quick validation
   * @param jti JWT ID
   * @param userId User ID
   * @param expiresIn Expiration time in seconds
   */
  private async cacheAccessToken(
    jti: string,
    userId: string,
    expiresIn: number,
  ): Promise<void> {
    const cacheKey = this.cacheService.createKey(CachePrefix.AUTH, `token:${jti}`);
    await this.cacheService.set(cacheKey, { userId, valid: true }, expiresIn);
  }

  /**
   * Validate an access token
   * @param token Access token
   * @returns Decoded token payload if valid, null otherwise
   */
  async validateAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      // Verify the token signature
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;

      // Check if the token is in the cache (for quick validation)
      if (decoded.jti) {
        const cacheKey = this.cacheService.createKey(CachePrefix.AUTH, `token:${decoded.jti}`);
        const cachedToken = await this.cacheService.get<{ userId: string; valid: boolean }>(cacheKey);

        if (cachedToken && cachedToken.valid && cachedToken.userId === decoded.sub) {
          return decoded;
        }

        // If not in cache but signature is valid, add to cache
        if (!cachedToken) {
          const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : this.accessTokenExpiration;
          if (expiresIn > 0) {
            await this.cacheAccessToken(decoded.jti, decoded.sub, expiresIn);
            return decoded;
          }
        }
      }

      // If no JTI or not in cache, return the decoded token anyway (it passed signature verification)
      return decoded;
    } catch (error: any) {
      this.logger.debug(`Invalid access token: ${error.message}`);
      return null;
    }
  }

  /**
   * Refresh an access token using a refresh token
   * @param refreshToken Refresh token
   * @param deviceId Device ID (optional)
   * @returns New access and refresh tokens
   */
  async refreshTokens(refreshToken: string, deviceId?: string): Promise<TokenResponse | null> {
    try {
      // Verify the refresh token signature
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as TokenPayload;

      if (!decoded || !decoded.jti || !decoded.sub) {
        throw new Error('Invalid refresh token');
      }

      // Check if the token exists in the database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { id: decoded.jti },
      }) as any; // Use type assertion to avoid TypeScript errors

      if (!storedToken || storedToken.customerId !== decoded.sub) {
        throw new Error('Refresh token not found');
      }

      // Check if the token is expired
      if (storedToken.expiresAt < new Date()) {
        // Delete the expired token
        await this.prisma.refreshToken.delete({
          where: { id: decoded.jti },
        });
        throw new Error('Refresh token expired');
      }

      // Skip device ID check as it's not stored in the schema
      // We'll still use the deviceId parameter for the new token generation

      // Delete the old refresh token (rotation)
      await this.prisma.refreshToken.delete({
        where: { id: decoded.jti },
      });

      // Generate new tokens
      return this.generateTokens(
        decoded.sub,
        decoded.email,
        decoded.role,
        deviceId, // Use the provided deviceId
      );
    } catch (error: any) {
      this.logger.debug(`Error refreshing tokens: ${error.message}`);
      return null;
    }
  }

  /**
   * Invalidate all tokens for a user
   * @param userId User ID
   */
  async invalidateAllTokens(userId: string): Promise<void> {
    try {
      // Delete all refresh tokens for the user
      await this.prisma.refreshToken.deleteMany({
        where: { customerId: userId },
      });

      // Invalidate all access tokens in the cache
      // This is a best-effort approach, as we can't invalidate tokens that aren't in the cache
      // Clients will still need to wait for the tokens to expire
      const cachePrefix = this.cacheService.createKey(CachePrefix.AUTH, `user:${userId}`);
      await this.cacheService.deleteByPrefix(cachePrefix);

      this.logger.debug(`Invalidated all tokens for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Error invalidating tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalidate a specific refresh token
   * @param tokenId Token ID
   */
  async invalidateRefreshToken(tokenId: string): Promise<void> {
    try {
      // Delete the refresh token
      await this.prisma.refreshToken.delete({
        where: { id: tokenId },
      });

      // Invalidate the corresponding access token in the cache
      const cacheKey = this.cacheService.createKey(CachePrefix.AUTH, `token:${tokenId}`);
      await this.cacheService.delete(cacheKey);

      this.logger.debug(`Invalidated refresh token ${tokenId}`);
    } catch (error: any) {
      this.logger.error(`Error invalidating refresh token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hash a token for secure storage
   * @param token Token to hash
   * @returns Hashed token
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
