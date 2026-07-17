import { describe, it, expect } from 'vitest';
import { navItemsForRole } from './permissions';

describe('navItemsForRole', () => {
  it('includes Settings for a Super Admin', () => {
    const items = navItemsForRole('SUPER_ADMIN');
    expect(items.some((item) => item.label === 'Settings')).toBe(true);
  });

  it('hides Settings from a Fan', () => {
    const items = navItemsForRole('FAN');
    expect(items.some((item) => item.label === 'Settings')).toBe(false);
  });

  it('hides Vendor Management from a Fan but shows it to a Vendor', () => {
    expect(navItemsForRole('FAN').some((item) => item.label === 'Vendor Management')).toBe(false);
    expect(navItemsForRole('VENDOR').some((item) => item.label === 'Vendor Management')).toBe(true);
  });

  it('shows role="all" items (like Dashboard) to every role', () => {
    const roles = ['SUPER_ADMIN', 'FAN', 'REFEREE', 'VOLUNTEER'] as const;
    for (const role of roles) {
      expect(navItemsForRole(role).some((item) => item.label === 'Dashboard')).toBe(true);
    }
  });
});
