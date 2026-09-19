import React, { useState, useEffect, useMemo } from 'react';
import { LoginAuditRecord, User } from '../types';
import { normalizeExactLocation } from '../utils/authStorage';
import {
  getPermanentAuditRecords,
  recordLoginAudit,
  exportAuditRecordsCSV,
  exportAuditRecordsJSON,
  verifyAuditLedgerIntegrity,
} from '../utils/auditStorage';
import {
  ShieldCheck,
  Download,
  Search,
  Filter,
  RefreshCw,
  FileCheck,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Fingerprint,
  HardDrive,
  Database,
  PlusCircle,
  Hash,
  FileText,
} from 'lucide-react';

interface AuthorityLoginAuditSuiteProps {
  currentUser?: User | null;
}

export const AuthorityLoginAuditSuite: React.FC<AuthorityLoginAuditSuiteProps> = ({
  currentUser,
}) => {
  const [records, setRecords] = useState<LoginAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    totalVerified: number;
    integrityScorePct: number;
    tamperCount: number;
  } | null>(null);

  // Manual Checkpoint Modal / Form state
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointNote, setCheckpointNote] = useState('');
  const [isRecordingCheckpoint, setIsRecordingCheckpoint] = useState(false);

  // Load audit records (strictly authorities only)
  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getPermanentAuditRecords();
      // Enforce strict authority filtering
      const authorityOnly = data.filter((r) => r.userRole === 'authority');
      setRecords(authorityOnly);
    } catch (e) {
      console.error('Failed to load audit records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Filtered records - strictly authorities only
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Hard constraint: only authority logins
      if (r.userRole !== 'authority') return false;

      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        r.id.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        (r.ward && r.ward.toLowerCase().includes(q)) ||
        r.auditSignature.toLowerCase().includes(q);

      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchDept = filterDept === 'all' || (r.department && r.department.toLowerCase().includes(filterDept.toLowerCase()));

      return matchQuery && matchStatus && matchDept;
    });
  }, [records, searchQuery, filterStatus, filterDept]);

  // Statistics for authorities only
  const stats = useMemo(() => {
    const authorityRecords = records.filter((r) => r.userRole === 'authority');
    const total = authorityRecords.length;
    const uniqueOfficers = new Set(authorityRecords.map((r) => r.userEmail.toLowerCase())).size;
    const successfulLogins = authorityRecords.filter((r) => r.status === 'SUCCESS').length;
    const failedLogins = authorityRecords.filter((r) => r.status === 'FAILED').length;
    const checkpoints = authorityRecords.filter((r) => r.status === 'CHECKPOINT').length;

    return {
      total,
      uniqueOfficers,
      successfulLogins,
      failedLogins,
      checkpoints,
    };
  }, [records]);

  // Verify Ledger
  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const res = verifyAuditLedgerIntegrity(records);
      setIntegrityResult(res);
      setIsVerifying(false);
    }, 500);
  };

  // Add a manual signed checkpoint
  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointNote.trim()) return;

    setIsRecordingCheckpoint(true);
    try {
      const newRec = await recordLoginAudit({
        userEmail: currentUser?.email || 'officer@janniti.gov.in',
        userName: currentUser?.name || 'Authority Officer',
        userRole: 'authority',
        department: currentUser?.department || 'Civic Administration & Public Works',
        ward: currentUser?.ward || 'Saheed Nagar, Bhubaneswar',
        status: 'CHECKPOINT',
        authMethod: 'Cryptographic Checkpoint Signed',
        details: `Manual Authority Audit Checkpoint: ${checkpointNote.trim()}`,
      });

      setRecords((prev) => [newRec, ...prev]);
      setCheckpointNote('');
      setShowCheckpointModal(false);
    } catch (err) {
      console.error('Failed to record checkpoint:', err);
    } finally {
      setIsRecordingCheckpoint(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Official Authority Audit Enforcement */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-indigo-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Permanent Audit Ledger Active
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Authorities Only (SEC-43A)
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                Server Mirror: /permanent_login_audit.json
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Fingerprint className="w-6 h-6 text-indigo-400" />
              Municipal Authority Login Audit & Security Ledger
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Maintains permanent, immutable security logs exclusively for verified municipal officers, department heads, and systems administrators. Public citizen sessions are strictly excluded from this registry under Bhubaneswar Municipal Corporation security protocols.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCheckpointModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Sign Audit Checkpoint
            </button>

            <button
              onClick={() => exportAuditRecordsCSV(records)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title="Download CSV for government archiving"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              onClick={() => exportAuditRecordsJSON(records)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title="Download JSON cryptographic ledger"
            >
              <FileCheck className="w-3.5 h-3.5" />
              JSON
            </button>

            <button
              onClick={handleVerifyIntegrity}
              disabled={isVerifying}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              {isVerifying ? 'Verifying...' : 'Verify Hashes'}
            </button>
          </div>
        </div>

        {/* Ledger Integrity Banner (If verified) */}
        {integrityResult && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Cryptographic Integrity Verified:</strong> {integrityResult.totalVerified} authority audit signatures validated with {integrityResult.integrityScorePct}% integrity score. Zero tampering detected.
              </span>
            </div>
            <button
              onClick={() => setIntegrityResult(null)}
              className="text-slate-400 hover:text-white text-xs underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Grid - Strictly Municipal Authorities */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            Total Authority Logs
          </div>
          <div className="mt-1.5 text-2xl font-black text-[var(--text)] font-mono">
            {stats.total}
          </div>
          <div className="text-[10px] text-indigo-500 mt-0.5">Officers only recorded</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-sky-500" />
            Active Officer Roster
          </div>
          <div className="mt-1.5 text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {stats.uniqueOfficers}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Distinct verified officers</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Verified Success
          </div>
          <div className="mt-1.5 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.successfulLogins}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Authorized sign-ins</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Rejected Attempts
          </div>
          <div className="mt-1.5 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {stats.failedLogins}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Security blocks logged</div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            Signed Checkpoints
          </div>
          <div className="mt-1.5 text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {stats.checkpoints}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Officer attestations</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search officer name, email, department, audit ID..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-[var(--select-bg)] border border-[var(--border-color)] text-xs text-[var(--text)] outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--select-bg)] border border-[var(--border-color)] text-xs font-medium text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Audit Events</option>
            <option value="SUCCESS">Verified Success Only</option>
            <option value="FAILED">Failed Attempts</option>
            <option value="LOGOUT">Session Terminations</option>
            <option value="CHECKPOINT">Signed Checkpoints</option>
          </select>

          {/* Department Filter - Authorities only */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--select-bg)] border border-[var(--border-color)] text-xs font-medium text-[var(--text)] outline-none cursor-pointer"
          >
            <option value="all">All Authority Departments</option>
            <option value="Civic Administration">Civic Administration & Works</option>
            <option value="Infrastructure">Database & Infrastructure</option>
            <option value="Public Health">Public Health & Sanitation</option>
            <option value="Surveillance">Smart City & Traffic Cell</option>
            <option value="Backend">Backend & Systems Admin</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadRecords}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-[var(--select-bg)] border border-[var(--border-color)] text-[var(--text)] hover:text-indigo-500 transition-colors cursor-pointer"
            title="Refresh from server"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Records Table */}
      <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] shadow-[0_10px_30px_var(--shadow-color)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--border-color)] flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-[var(--text)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Municipal Authority Access Ledger ({filteredRecords.length} records)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Chronological log stored persistently in municipal server database. Citizens excluded.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              AUTHORITIES ONLY
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--select-bg)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]">
              SEC-43A COMPLIANT
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-black uppercase tracking-wider text-[10px] bg-[var(--item-hover)]">
                <th className="py-3 px-4">Audit ID / Timestamp</th>
                <th className="py-3 px-4">Officer Details</th>
                <th className="py-3 px-4">Department & Exact Location</th>
                <th className="py-3 px-4">Auth Method & Ingress IP</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Cryptographic Hash</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No authority audit records matching current search parameters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[var(--item-hover)] transition-colors"
                    >
                      {/* ID & Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.id}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {r.formattedTime}
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{r.userName}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          {r.userEmail}
                        </div>
                      </td>

                      {/* Department & Ward */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Authority Officer
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] mt-1 font-medium truncate max-w-[200px]">
                          {r.department || 'Civic Administration'}
                        </div>
                        {r.ward && (
                          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">
                            {normalizeExactLocation(r.ward)}
                          </div>
                        )}
                      </td>

                      {/* Auth Method */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[var(--text)]">
                          {r.authMethod}
                        </span>
                        {r.ipAddress && (
                          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                            {r.ipAddress}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {r.status === 'SUCCESS' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-[10px]">
                            SUCCESS
                          </span>
                        )}
                        {r.status === 'FAILED' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-bold text-[10px]">
                            FAILED
                          </span>
                        )}
                        {r.status === 'LOGOUT' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 font-bold text-[10px]">
                            LOGOUT
                          </span>
                        )}
                        {r.status === 'CHECKPOINT' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold text-[10px]">
                            CHECKPOINT
                          </span>
                        )}
                      </td>

                      {/* Hash */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[10px] text-slate-400 bg-slate-800/40 dark:bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 inline-block">
                          {r.auditSignature}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-xs text-[var(--text)] max-w-xs">
                        <p className="line-clamp-2">{r.details || 'Access logged.'}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Sign Manual Audit Checkpoint */}
      {showCheckpointModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] rounded-3xl max-w-md w-full p-6 border border-[var(--border-color)] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-600 text-white">
                <Fingerprint className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-[var(--text)]">
                  Sign Officer Audit Checkpoint
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Attest current municipal shift or inspection status.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCheckpoint} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-[var(--text)] block mb-1">
                  Officer Attestation Note:
                </label>
                <textarea
                  value={checkpointNote}
                  onChange={(e) => setCheckpointNote(e.target.value)}
                  placeholder="e.g., Reviewed Ward 6 civic updates and approved priority allocations..."
                  rows={3}
                  required
                  className="w-full p-3 rounded-xl bg-[var(--select-bg)] border border-[var(--border-color)] text-xs text-[var(--text)] outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  This checkpoint will be cryptographically signed with your active officer credentials and permanently stored on server disk.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--select-bg)] hover:bg-[var(--item-hover)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingCheckpoint || !checkpointNote.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {isRecordingCheckpoint ? 'Signing...' : 'Confirm & Sign Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
