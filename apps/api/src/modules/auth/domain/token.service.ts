import { JwtPayload, TokenPair } from './auth.types';

export const TOKEN_SERVICE = 'TOKEN_SERVICE';

export interface TokenPairWithMeta extends TokenPair {
  jti: string;
  expiresAt: Date;
}

export interface ITokenService {
  generatePair(payload: JwtPayload): TokenPairWithMeta;
  verifyRefresh(token: string): JwtPayload;
}
