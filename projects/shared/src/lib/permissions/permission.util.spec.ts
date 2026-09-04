import { hasAllPermissions, hasAnyPermission, hasPermission } from './permission.util';

describe('permission.util', () => {
  const granted = ['identity.role.manage', 'organization.faculty.write'];

  describe('hasPermission', () => {
    it('returns true when the permission is granted', () => {
      expect(hasPermission(granted, 'identity.role.manage')).toBeTrue();
    });

    it('returns false when it is not', () => {
      expect(hasPermission(granted, 'audit.entry.export')).toBeFalse();
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when at least one required permission is granted', () => {
      expect(hasAnyPermission(granted, ['audit.entry.export', 'identity.role.manage'])).toBeTrue();
    });

    it('returns false when none are granted', () => {
      expect(hasAnyPermission(granted, ['audit.entry.export'])).toBeFalse();
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true only when every required permission is granted', () => {
      expect(
        hasAllPermissions(granted, ['identity.role.manage', 'organization.faculty.write']),
      ).toBeTrue();
      expect(
        hasAllPermissions(granted, ['identity.role.manage', 'audit.entry.export']),
      ).toBeFalse();
    });
  });
});
