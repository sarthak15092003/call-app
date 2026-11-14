'use client';

import React, { useState, useEffect } from 'react';
import { crmStore } from '@/lib/store';
import { User, Lead, CallAttempt } from '@/types';
import {
  UserCog,
  Plus,
  Users,
  PhoneCall,
  Clock,
  TrendingUp,
  CheckCircle2,
  Mail,
  Phone,
  Shield,
  Award,
} from 'lucide-react';

export default function TeamManagementPage() {
  const [currentUser] = useState<User>(crmStore.getCurrentUser());
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [attempts, setAttempts] = useState<CallAttempt[]>([]);

  // Add agent form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentExt, setNewAgentExt] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<'admin' | 'agent'>('agent');

  const loadData = () => {
    setUsers(crmStore.getUsers());
    setLeads(crmStore.getLeads());
    setAttempts(crmStore.getCallAttempts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('smartcall_store_update', loadData);
    return () => window.removeEventListener('smartcall_store_update', loadData);
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !newAgentEmail) return;

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: newAgentName,
      email: newAgentEmail,
      phone: newAgentPhone || '+919900011222',
      agent_ext: newAgentExt || String(users.length + 101),
      role: newAgentRole,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    crmStore.saveUsers(updated);
    crmStore.logAudit({
      action: 'USER_CREATED',
      entity_type: 'user',
      entity_id: newUser.id,
      details: `Created new ${newUser.role}: ${newUser.name} (Ext ${newUser.agent_ext})`,
    });

    setShowAddModal(false);
    setNewAgentName('');
    setNewAgentEmail('');
    setNewAgentPhone('');
    setNewAgentExt('');
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Calling Team & Agent Performance
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage telephony agents, extension routing numbers, lead allocations & conversion productivity
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Agent</span>
          </button>
        )}
      </div>

      {/* Agents Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => {
          const userLeads = leads.filter((l) => l.assigned_agent_id === user.id);
          const userCalls = attempts.filter((a) => a.agent_id === user.id);
          const userConnected = userCalls.filter((a) => a.status === 'connected');
          const talkSec = userConnected.reduce((s, c) => s + (c.connected_duration || 0), 0);
          const conversions = userLeads.filter((l) => l.interest_status === 'Converted').length;
          const connectRate = userCalls.length > 0 ? Math.round((userConnected.length / userCalls.length) * 100) : 0;

          return (
            <div
              key={user.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5"
            >
              <div>
                {/* User Top Info */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-base flex items-center justify-center overflow-hidden shadow-md shadow-indigo-500/20">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.slice(0, 2)
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">{user.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {user.role}
                  </span>
                </div>

                {/* Extension & Phone */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">PBX Extension</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">Ext {user.agent_ext}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Caller Phone</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{user.phone}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Leads</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{userLeads.length}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Calls Made</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{userCalls.length}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Connect Rate</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{connectRate}%</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Conversions</div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">{conversions}</div>
                  </div>
                </div>
              </div>

              {/* Total Talk Time footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Total Talk Duration:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatSec(talkSec)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Add New Calling Team Member</h3>
            <p className="text-xs text-slate-500">
              Provision agent account, phone number for gateway caller routing, and PBX extension.
            </p>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deepika Reddy"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. deepika@smartcall.com"
                  value={newAgentEmail}
                  onChange={(e) => setNewAgentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number (E.164)</label>
                <input
                  type="text"
                  placeholder="+919876543210"
                  value={newAgentPhone}
                  onChange={(e) => setNewAgentPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">PBX Extension</label>
                  <input
                    type="text"
                    placeholder="103"
                    value={newAgentExt}
                    onChange={(e) => setNewAgentExt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">User Role</label>
                  <select
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="agent">Calling Agent</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

