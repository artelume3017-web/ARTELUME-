import { CompanyMember } from '../types';

export const DEFAULT_STAFF_MEMBERS: CompanyMember[] = [
  {
    uid: 'owner_artelume_dir',
    email: 'artelume3017@gmail.com',
    displayName: 'Artè Lume Studio Director',
    role: 'owner',
    phone: '+91 98490 12345',
    status: 'active',
    joinedAt: '2026-01-01',
    assignedBranchId: 'artelume',
    assignedBranchName: 'Branch 1: Hyderabad (Head Studio)',
    pin: '2026'
  },
  {
    uid: 'staff_hyd_sales',
    email: 'vikram.hyd@artelume.com',
    displayName: 'Vikram Sharma (Sales Lead)',
    role: 'sales',
    phone: '9849012345',
    status: 'active',
    joinedAt: '2026-02-15',
    assignedBranchId: 'artelume',
    assignedBranchName: 'Branch 1: Hyderabad (Head Studio)',
    pin: '1234'
  },
  {
    uid: 'staff_hyd_delivery',
    email: 'ramesh.hyd@artelume.com',
    displayName: 'Ramesh Babu (Logistics)',
    role: 'delivery',
    phone: '9849012346',
    status: 'active',
    joinedAt: '2026-03-01',
    assignedBranchId: 'artelume',
    assignedBranchName: 'Branch 1: Hyderabad (Head Studio)',
    pin: '1234'
  },
  {
    uid: 'staff_vzg_sales',
    email: 'sneha.vzg@artelume.com',
    displayName: 'Sneha Rao (Design & Sales)',
    role: 'sales',
    phone: '8912789012',
    status: 'active',
    joinedAt: '2026-03-10',
    assignedBranchId: 'artelume-vizag',
    assignedBranchName: 'Branch 2: Vizag (Branch Studio)',
    pin: '5678'
  },
  {
    uid: 'staff_vzg_delivery',
    email: 'kishore.vzg@artelume.com',
    displayName: 'Kishore Kumar (Dispatch)',
    role: 'delivery',
    phone: '8912789013',
    status: 'active',
    joinedAt: '2026-03-12',
    assignedBranchId: 'artelume-vizag',
    assignedBranchName: 'Branch 2: Vizag (Branch Studio)',
    pin: '5678'
  }
];

export const getStoredStaffMembers = (): CompanyMember[] => {
  try {
    const raw = localStorage.getItem('artelume_team_members');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_STAFF_MEMBERS;
};

export const saveStoredStaffMembers = (members: CompanyMember[]) => {
  try {
    localStorage.setItem('artelume_team_members', JSON.stringify(members));
  } catch (e) {}
};
