import { describe, it, expect } from 'vitest';
import { calculatePowerInterestQuadrant } from './stakeholder.entity';
import { RiskImpact } from '@prisma/client';

describe('calculatePowerInterestQuadrant', () => {
  it('returns null when influence or interest is missing', () => {
    expect(calculatePowerInterestQuadrant(null, RiskImpact.HIGH)).toBeNull();
    expect(calculatePowerInterestQuadrant(RiskImpact.HIGH, null)).toBeNull();
    expect(calculatePowerInterestQuadrant(null, null)).toBeNull();
  });

  it('returns MANAGE_CLOSELY for high power + high interest', () => {
    expect(calculatePowerInterestQuadrant(RiskImpact.HIGH, RiskImpact.VERY_HIGH)).toBe('MANAGE_CLOSELY');
  });

  it('returns KEEP_SATISFIED for high power + low interest', () => {
    expect(calculatePowerInterestQuadrant(RiskImpact.VERY_HIGH, RiskImpact.LOW)).toBe('KEEP_SATISFIED');
  });

  it('returns KEEP_INFORMED for low power + high interest', () => {
    expect(calculatePowerInterestQuadrant(RiskImpact.LOW, RiskImpact.VERY_HIGH)).toBe('KEEP_INFORMED');
  });

  it('returns MONITOR for low power + low interest', () => {
    expect(calculatePowerInterestQuadrant(RiskImpact.VERY_LOW, RiskImpact.VERY_LOW)).toBe('MONITOR');
  });

  it('treats MEDIUM as the low/conservative side of the threshold', () => {
    expect(calculatePowerInterestQuadrant(RiskImpact.MEDIUM, RiskImpact.MEDIUM)).toBe('MONITOR');
    expect(calculatePowerInterestQuadrant(RiskImpact.MEDIUM, RiskImpact.VERY_HIGH)).toBe('KEEP_INFORMED');
  });
});
