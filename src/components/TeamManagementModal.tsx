import React, { useState } from 'react';
import { CompanyMember, AppRole, BranchProfile } from '../types';
import { saveCompanyMember, deleteCompanyMember } from '../firebase/syncService';
import { useAuth } from '../firebase/AuthContext';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: CompanyMember[];
  onMembersChange: (updated: CompanyMember[]) => void;
  onShowToast: (msg: string) => void;
  activeBranch: BranchProfile;
}

const ROLE_DEFINITIONS: Record<
  AppRole,
  {
    label: string;
    icon: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    summary: string;
    permissions: string[];
  }
> = {
  owner: {
    label: 'Studio Owner',
    icon: '👑',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    borderColor: 'border-amber-500/50',
    summary: 'Full master authority over all studio operations, P&L profit margins, branch setups & staff roles.',
    permissions: [
      'Master Studio & Branch Configuration',
      'Confidential P&L Gross Margins & Net Profit',
      'Team & Staff Role Assignment',
      'Bank & Cash Accounts Reconciliation',
      'All Quotations, Discounts & Client Proposals',
      'Delivery Challans & Dispatch Controls'
    ]
  },
  admin: {
    label: 'Administrator',
    icon: '🛡️',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    borderColor: 'border-blue-500/50',
    summary: 'Financial operations, payment ledger verification, purchases, expenses & quotation auditing.',
    permissions: [
      'Advance, Stage & Final Payment Recording',
      'Bank & Cash Ledger Verifications',
      'Purchases & Operational Expense Logging',
      'Quotation Approval & Client Accounts',
      'Delivery Challan Audits & Site Dispatches',
      '❌ Restricted: Confidential Owner P&L Margins',
      '❌ Restricted: Altering Owner Account'
    ]
  },
  sales: {
    label: 'Sales Person',
    icon: '💼',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    borderColor: 'border-emerald-500/50',
    summary: 'Architectural quote building, product spec presentation, client negotiation & booking advances.',
    permissions: [
      'Quotation Builder & Spec Sheets',
      'Client Presentation, PDF & Excel Export',
      'Booking Advance Payment Receipts',
      'Product Catalog & Lighting Fixture Specs',
      '❌ Restricted: Purchase Bills & Company Expenses',
      '❌ Restricted: Bank Ledger & Cash In-Hand Balance',
      '❌ Restricted: Confidential Profit Margins'
    ]
  },
  delivery: {
    label: 'Delivery Person',
    icon: '🚚',
    badgeBg: 'bg-amber-600/20',
    badgeText: 'text-amber-400',
    borderColor: 'border-amber-600/50',
    summary: 'Site logistics, goods dispatch, client signature acknowledgement & on-delivery cash/UPI collection.',
    permissions: [
      'Delivery Challan Execution & Status Updates',
      'On-Delivery Payment Receipts (Cash / UPI)',
      'Site Address & Transporter Details',
      'Client Delivery Sign-Off Acknowledgement',
      '❌ Restricted: Quotation Creation or Price Adjustments',
      '❌ Restricted: Company Financial Ledgers & Margins'
    ]
  },
  member: {
    label: 'Studio Member',
    icon: '👤',
    badgeBg: 'bg-stone-500/20',
    badgeText: 'text-stone-300',
    borderColor: 'border-stone-500/50',
    summary: 'Standard studio staff view.',
    permissions: ['Basic Quotation View']
  },
  staff: {
    label: 'Studio Staff',
    icon: '👤',
    badgeBg: 'bg-stone-500/20',
    badgeText: 'text-stone-300',
    borderColor: 'border-stone-500/50',
    summary: 'Standard staff member awaiting assignment.',
    permissions: ['Pending Assignment by Owner']
  }
};

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  members,
  onMembersChange,
  onShowToast,
  activeBranch
}) => {
  const { company, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'roster' | 'add' | 'matrix'>('roster');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [pendingRoles, setPendingRoles] = useState<Record<string, AppRole>>({});
  const [isSavingUid, setIsSavingUid] = useState<string | null>(null);

  // New Member Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('sales');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleRoleSelect = (uid: string, role: AppRole) => {
    setPendingRoles(prev => ({ ...prev, [uid]: role }));
  };

  const handleSaveRole = async (member: CompanyMember) => {
    const updatedRole = pendingRoles[member.uid] || member.role;
    setIsSavingUid(member.uid);
    try {
      const updatedMember: CompanyMember = {
        ...member,
        role: updatedRole,
        assignedBy: userProfile?.email || 'artelume3017@gmail.com'
      };

      if (company?.id) {
        await saveCompanyMember(company.id, updatedMember);
      }

      const nextMembers = members.map(m => (m.uid === member.uid ? updatedMember : m));
      onMembersChange(nextMembers);
      try {
        localStorage.setItem('artelume_team_members', JSON.stringify(nextMembers));
      } catch (e) {}

      // Clear pending
      setPendingRoles(prev => {
        const copy = { ...prev };
        delete copy[member.uid];
        return copy;
      });

      onShowToast(`Updated role for ${member.displayName} to ${ROLE_DEFINITIONS[updatedRole]?.label || updatedRole}!`);
    } catch (err) {
      console.error('Role update error:', err);
      onShowToast('Failed to save role. Please try again.');
    } finally {
      setIsSavingUid(null);
    }
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      onShowToast('Please provide both staff name and email address.');
      return;
    }

    setIsAdding(true);
    try {
      const uid = `staff_${Date.now()}`;
      const newMember: CompanyMember = {
        uid,
        displayName: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim() || undefined,
        role: newRole,
        status: 'invited',
        joinedAt: new Date().toISOString().split('T')[0],
        assignedBy: userProfile?.email || 'artelume3017@gmail.com'
      };

      if (company?.id) {
        await saveCompanyMember(company.id, newMember);
      }

      const nextMembers = [...members, newMember];
      onMembersChange(nextMembers);
      try {
        localStorage.setItem('artelume_team_members', JSON.stringify(nextMembers));
      } catch (e) {}

      onShowToast(`Staff member ${newName.trim()} pre-assigned as ${ROLE_DEFINITIONS[newRole].label}!`);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('sales');
      setActiveTab('roster');
    } catch (err) {
      console.error(err);
      onShowToast('Error adding staff member.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMember = async (member: CompanyMember) => {
    if (member.role === 'owner') {
      onShowToast('Cannot remove the primary Studio Owner.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${member.displayName} (${member.email}) from the studio roster?`)) {
      return;
    }

    try {
      if (company?.id) {
        await deleteCompanyMember(company.id, member.uid);
      }
      const nextMembers = members.filter(m => m.uid !== member.uid);
      onMembersChange(nextMembers);
      try {
        localStorage.setItem('artelume_team_members', JSON.stringify(nextMembers));
      } catch (e) {}
      onShowToast(`Removed ${member.displayName} from studio team.`);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to remove member.');
    }
  };

  const handleCopyCode = () => {
    if (company?.inviteCode) {
      navigator.clipboard.writeText(company.inviteCode);
      onShowToast(`Copied Team Join Code: ${company.inviteCode}`);
    }
  };

  const handleShareInviteWhatsApp = (member?: CompanyMember) => {
    const code = company?.inviteCode || 'AL-STUDIO';
    let text = `*Invitation to Join ${company?.name || 'Artè Lume Lighting Studio'} Team*\n\n`;
    if (member) {
      text += `Hello *${member.displayName}*,\n`;
      text += `You have been assigned the role: *${ROLE_DEFINITIONS[member.role]?.label || member.role}* at our studio.\n\n`;
    } else {
      text += `Hello,\nYou have been invited to join the Artè Lume Studio team portal.\n\n`;
    }
    text += `🔑 *Studio Join Code:* \`${code}\`\n`;
    text += `📱 Access the studio app on your mobile, tablet or PC.\n`;
    text += `When registering or signing in, enter this join code to automatically connect to our organization with your assigned permissions.\n\n`;
    text += `_Authorized by Studio Owner (${userProfile?.email || 'artelume3017@gmail.com'})_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredMembers = members.filter(m => {
    if (filterRole === 'all') return true;
    return m.role === filterRole;
  });

  return (
    <div className="fixed inset-0 z-[9995] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#18110c] text-white border border-[#3e271a] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#2c170d] via-[#1f110a] to-[#18110c] border-b border-[#3e271a] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#df9c20] to-[#7b3f22] flex items-center justify-center text-2xl shadow-lg border border-amber-400/30">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-black text-lg sm:text-xl text-[#f5eee6] tracking-wide">
                  Team Staff &amp; Role Management
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#df9c20]/20 text-[#df9c20] border border-[#df9c20]/40 uppercase tracking-wider">
                  Owner Portal
                </span>
              </div>
              <p className="text-xs text-[#a89588] mt-0.5">
                Assign staff roles to Administrator, Sales Person, and Delivery Person with verified permission controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[#9a8576] hover:text-white p-2 rounded-lg hover:bg-white/5 cursor-pointer text-lg"
              title="Close Modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Studio Join Code Banner */}
        <div className="bg-[#20130c] border-b border-[#3e271a] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 text-lg">🔑</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#a89588] font-bold">
                Studio Multi-Device Team Code
              </div>
              <div className="font-mono font-black text-base text-[#df9c20] tracking-widest">
                {company?.inviteCode || 'AL-STUDIO'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-[#7b3f22] hover:bg-[#914a28] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Copy Studio Join Code"
            >
              <span>📋</span>
              <span>Copy Code</span>
            </button>
            <button
              type="button"
              onClick={() => handleShareInviteWhatsApp()}
              className="px-3 py-1.5 bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Share Invite on WhatsApp"
            >
              <span>📱</span>
              <span>WhatsApp Invite</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#3e271a] bg-[#140c08] px-4 sm:px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-[#df9c20] text-[#df9c20]'
                : 'border-transparent text-[#9a8576] hover:text-[#d3c2b4]'
            }`}
          >
            <span>👥</span>
            <span>Staff Roster ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'add'
                ? 'border-[#df9c20] text-[#df9c20]'
                : 'border-transparent text-[#9a8576] hover:text-[#d3c2b4]'
            }`}
          >
            <span>➕</span>
            <span>Pre-Assign New Staff</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-[#df9c20] text-[#df9c20]'
                : 'border-transparent text-[#9a8576] hover:text-[#d3c2b4]'
            }`}
          >
            <span>📋</span>
            <span>Role Permissions Matrix</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: STAFF ROSTER */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Role filter buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[#8e7b70] text-[11px] font-bold uppercase tracking-wider mr-1">Filter:</span>
                  {[
                    { id: 'all', label: `All Staff (${members.length})` },
                    { id: 'owner', label: `👑 Owner (${members.filter(m => m.role === 'owner').length})` },
                    { id: 'admin', label: `🛡️ Admin (${members.filter(m => m.role === 'admin').length})` },
                    { id: 'sales', label: `💼 Sales (${members.filter(m => m.role === 'sales').length})` },
                    { id: 'delivery', label: `🚚 Delivery (${members.filter(m => m.role === 'delivery').length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterRole(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        filterRole === tab.id
                          ? 'bg-[#df9c20] text-[#18110c] font-bold shadow-xs'
                          : 'bg-[#22150e] text-[#a89588] hover:text-white border border-[#3e271a]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#8e7b70]">
                  🔒 Non-owner logins will be locked strictly to their assigned role.
                </div>
              </div>

              {/* Members List Cards */}
              <div className="space-y-3">
                {filteredMembers.map(member => {
                  const currentSelectedRole = pendingRoles[member.uid] || member.role;
                  const hasChanged = currentSelectedRole !== member.role;
                  const roleDef = ROLE_DEFINITIONS[currentSelectedRole] || ROLE_DEFINITIONS.sales;
                  const isOwner = member.role === 'owner' || member.email === 'artelume3017@gmail.com';

                  return (
                    <div
                      key={member.uid}
                      className={`p-4 rounded-xl border transition-all ${
                        hasChanged
                          ? 'bg-[#29170e] border-[#df9c20] shadow-md shadow-amber-950/30'
                          : 'bg-[#22150e] border-[#3e271a] hover:border-[#523321]'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Member Identity & Details */}
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border shadow-md ${
                              currentSelectedRole === 'owner'
                                ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 border-amber-400/40'
                                : currentSelectedRole === 'admin'
                                ? 'bg-gradient-to-br from-blue-700 to-blue-900 text-blue-100 border-blue-400/40'
                                : currentSelectedRole === 'sales'
                                ? 'bg-gradient-to-br from-emerald-700 to-emerald-900 text-emerald-100 border-emerald-400/40'
                                : 'bg-gradient-to-br from-amber-700 to-orange-900 text-amber-100 border-orange-400/40'
                            }`}
                          >
                            {roleDef.icon}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#f5eee6]">{member.displayName}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleDef.badgeBg} ${roleDef.badgeText} border ${roleDef.borderColor}`}
                              >
                                {roleDef.label}
                              </span>
                              {isOwner && (
                                <span className="text-[10px] bg-amber-950/60 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                                  Primary Owner
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-[#a89588] flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-mono">
                              <span>✉ {member.email}</span>
                              {member.phone && <span>📞 {member.phone}</span>}
                              {member.joinedAt && <span className="text-stone-400">Joined: {member.joinedAt}</span>}
                            </div>

                            {/* Summary description */}
                            <div className="text-[11px] text-[#c4b5a8] mt-1.5 flex items-center gap-1.5">
                              <span className="text-[#df9c20]">↳</span>
                              <span>{roleDef.summary}</span>
                            </div>
                          </div>
                        </div>

                        {/* Role Selector & Save Action */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-end md:self-center">
                          {/* Role Dropdown */}
                          <div className="relative">
                            <select
                              value={currentSelectedRole}
                              disabled={isOwner && member.email === 'artelume3017@gmail.com'}
                              onChange={e => handleRoleSelect(member.uid, e.target.value as AppRole)}
                              className="w-full sm:w-auto bg-[#18110c] border border-[#4a3022] hover:border-[#df9c20] text-xs font-bold text-[#f5eee6] rounded-lg px-3 py-2 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="owner">👑 Owner (Full Studio Control)</option>
                              <option value="admin">🛡️ Administrator (Accounts &amp; Ledger)</option>
                              <option value="sales">💼 Sales Person (Quotes &amp; Advance)</option>
                              <option value="delivery">🚚 Delivery Person (Site Logistics)</option>
                            </select>
                          </div>

                          {/* Save Role Button */}
                          {hasChanged ? (
                            <button
                              type="button"
                              onClick={() => handleSaveRole(member)}
                              disabled={isSavingUid === member.uid}
                              className="px-3.5 py-2 bg-[#df9c20] hover:bg-[#efa624] text-[#18110c] text-xs font-black rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 animate-pulse"
                            >
                              <span>💾</span>
                              <span>{isSavingUid === member.uid ? 'Saving...' : 'Apply Role'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleShareInviteWhatsApp(member)}
                              className="px-3 py-2 bg-[#2a1a12] hover:bg-[#382318] text-[#d8c7b8] hover:text-white border border-[#4a3022] text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                              title="Send WhatsApp login invite to staff member"
                            >
                              <span>📱</span>
                              <span>Invite</span>
                            </button>
                          )}

                          {/* Delete Member (Non-owner only) */}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg border border-transparent hover:border-red-500/30 transition-colors cursor-pointer text-xs"
                              title="Remove staff member"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PRE-ASSIGN / ADD NEW STAFF */}
          {activeTab === 'add' && (
            <div className="bg-[#22150e] border border-[#3e271a] rounded-xl p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="font-serif font-bold text-base text-[#f5eee6] flex items-center gap-2">
                  <span>➕</span>
                  <span>Pre-Assign Staff Role &amp; Send Studio Invite</span>
                </h3>
                <p className="text-xs text-[#a89588] mt-1">
                  When this staff member registers or signs in with this email, their account will automatically inherit the assigned role without allowing them to modify permissions.
                </p>
              </div>

              <form onSubmit={handleAddNewMember} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-[#a89588] tracking-wider mb-1.5">
                      Staff Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra"
                      className="w-full bg-[#18110c] border border-[#4a3022] focus:border-[#df9c20] text-sm text-[#f5eee6] rounded-lg px-3.5 py-2.5 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-[#a89588] tracking-wider mb-1.5">
                      Work / Login Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="e.g. ramesh@artelume.com"
                      className="w-full bg-[#18110c] border border-[#4a3022] focus:border-[#df9c20] text-sm text-[#f5eee6] rounded-lg px-3.5 py-2.5 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-[#a89588] tracking-wider mb-1.5">
                      Mobile Number (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="e.g. +91 98490 00000"
                      className="w-full bg-[#18110c] border border-[#4a3022] focus:border-[#df9c20] text-sm text-[#f5eee6] rounded-lg px-3.5 py-2.5 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-[#a89588] tracking-wider mb-1.5">
                      Assigned Role Tier *
                    </label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as AppRole)}
                      className="w-full bg-[#18110c] border border-[#4a3022] focus:border-[#df9c20] text-sm font-bold text-[#df9c20] rounded-lg px-3.5 py-2.5 outline-none transition-colors cursor-pointer"
                    >
                      <option value="admin">🛡️ Administrator (Advance Payments, Accounts &amp; Ledger)</option>
                      <option value="sales">💼 Sales Person (Quotations, Spec Sheets &amp; Advance)</option>
                      <option value="delivery">🚚 Delivery Person (Site Logistics &amp; Challans)</option>
                      <option value="owner">👑 Studio Owner (Full Control &amp; P&amp;L)</option>
                    </select>
                  </div>
                </div>

                {/* Selected Role Preview Box */}
                <div className="p-3.5 bg-[#18110c] border border-[#4a3022] rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ROLE_DEFINITIONS[newRole].icon}</span>
                    <span className="text-xs font-bold text-[#f5eee6]">{ROLE_DEFINITIONS[newRole].label} Access:</span>
                  </div>
                  <p className="text-xs text-[#a89588]">{ROLE_DEFINITIONS[newRole].summary}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ROLE_DEFINITIONS[newRole].permissions.slice(0, 4).map((p, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          p.startsWith('❌') ? 'bg-red-950/40 text-red-300' : 'bg-emerald-950/40 text-emerald-300'
                        }`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('roster')}
                    className="px-4 py-2 border border-[#4a3022] hover:bg-white/5 text-[#a89588] hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="px-5 py-2 bg-[#df9c20] hover:bg-[#efa624] text-[#18110c] font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>➕</span>
                    <span>{isAdding ? 'Registering...' : 'Pre-Assign & Add to Team'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: PERMISSIONS MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="bg-[#22150e] border border-[#3e271a] rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#3e271a] bg-[#1a0f09]">
                  <h3 className="font-serif font-bold text-sm text-[#f5eee6] flex items-center gap-2">
                    <span>📋</span>
                    <span>Artè Lume Studio Role Access Matrix</span>
                  </h3>
                  <p className="text-xs text-[#a89588] mt-0.5">
                    Clear boundaries enforced across financial ledgers, quotation approvals, and logistics dispatches.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#140c08] text-[#a89588] uppercase tracking-wider text-[10px] border-b border-[#3e271a]">
                      <tr>
                        <th className="p-3">Feature / Capability</th>
                        <th className="p-3 text-amber-300">👑 Owner</th>
                        <th className="p-3 text-blue-300">🛡️ Admin</th>
                        <th className="p-3 text-emerald-300">💼 Sales</th>
                        <th className="p-3 text-orange-300">🚚 Delivery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3e271a] text-[#ded3c8]">
                      <tr>
                        <td className="p-3 font-semibold">Quotation Builder &amp; PDF/Excel Generation</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Full</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Full</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Full</td>
                        <td className="p-3 text-stone-500">View Only</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Advance Booking Payment Collection</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-stone-500">—</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">On-Delivery Cash &amp; UPI Collection</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-stone-500">—</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Delivery Challans &amp; Site Dispatch Sign-off</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-stone-500">View Only</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Primary</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Bank Accounts &amp; Cash In-Hand Ledgers</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Full Audit</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Verified</td>
                        <td className="p-3 text-red-400 font-bold">✕ Hidden</td>
                        <td className="p-3 text-red-400 font-bold">✕ Hidden</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Purchases &amp; Studio Expenses Logging</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Yes</td>
                        <td className="p-3 text-red-400 font-bold">✕ Hidden</td>
                        <td className="p-3 text-red-400 font-bold">✕ Hidden</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Confidential P&amp;L Gross Margins &amp; Net Profit</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Exclusive</td>
                        <td className="p-3 text-red-400 font-bold">✕ Locked</td>
                        <td className="p-3 text-red-400 font-bold">✕ Locked</td>
                        <td className="p-3 text-red-400 font-bold">✕ Locked</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Staff Role Assignment &amp; Studio Ownership</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Exclusive</td>
                        <td className="p-3 text-red-400 font-bold">✕ Locked</td>
                        <td className="p-3 text-red-400 font-bold">✕ Locked</td>
                        <td className="p-3 text-red-400 font-bold">✕ Locked</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#140c08] border-t border-[#3e271a] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#8e7b70] flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Artè Lume Studio Staff Security &amp; RBAC Active</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#2a1a12] hover:bg-[#382318] text-[#f5eee6] text-xs font-bold rounded-lg border border-[#4a3022] cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
