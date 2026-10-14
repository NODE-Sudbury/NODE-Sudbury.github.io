import { describe, expect, it } from 'vitest';
import { canManageRole, canOpenDashboard } from './admin';

describe('canOpenDashboard', () => {
  it('opens for the super admin and admins only', () => {
    expect(canOpenDashboard('super_admin')).toBe(true);
    expect(canOpenDashboard('admin')).toBe(true);
    expect(canOpenDashboard('check_in_volunteer')).toBe(false);
    expect(canOpenDashboard(undefined)).toBe(false);
  });
});

describe('canManageRole', () => {
  it('lets the super admin manage board admins and volunteers, not a super admin', () => {
    expect(canManageRole('super_admin', 'admin')).toBe(true);
    expect(canManageRole('super_admin', 'check_in_volunteer')).toBe(true);
    expect(canManageRole('super_admin', 'super_admin')).toBe(false);
  });

  it('lets an admin manage volunteers only', () => {
    expect(canManageRole('admin', 'check_in_volunteer')).toBe(true);
    expect(canManageRole('admin', 'admin')).toBe(false);
    expect(canManageRole('admin', 'super_admin')).toBe(false);
  });

  it('lets nobody else manage anyone', () => {
    expect(canManageRole('check_in_volunteer', 'check_in_volunteer')).toBe(false);
    expect(canManageRole(undefined, 'check_in_volunteer')).toBe(false);
  });
});
