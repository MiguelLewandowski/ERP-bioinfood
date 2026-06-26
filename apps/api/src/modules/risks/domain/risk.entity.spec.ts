import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from './risk.entity';
import { RiskProbability, RiskImpact } from '@prisma/client';

describe('calculateRiskScore', () => {
  it('should return 1 when VERY_LOW × VERY_LOW', () => {
    expect(calculateRiskScore(RiskProbability.VERY_LOW, RiskImpact.VERY_LOW)).toBe(1);
  });

  it('should return 16 when HIGH × HIGH', () => {
    expect(calculateRiskScore(RiskProbability.HIGH, RiskImpact.HIGH)).toBe(16);
  });

  it('should return 25 when VERY_HIGH × VERY_HIGH', () => {
    expect(calculateRiskScore(RiskProbability.VERY_HIGH, RiskImpact.VERY_HIGH)).toBe(25);
  });

  it('should return 6 when MEDIUM × LOW', () => {
    expect(calculateRiskScore(RiskProbability.MEDIUM, RiskImpact.LOW)).toBe(6);
  });

  it('should return 10 when VERY_HIGH × LOW', () => {
    expect(calculateRiskScore(RiskProbability.VERY_HIGH, RiskImpact.LOW)).toBe(10);
  });
});
