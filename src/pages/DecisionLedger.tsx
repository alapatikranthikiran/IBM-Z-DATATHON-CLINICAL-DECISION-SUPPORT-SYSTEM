import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  FileCheck2,
  History,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { DecisionRecord, UserRole } from '../types';
import { DecisionReplayModal } from '../components/DecisionReplayModal';

export const DecisionLedger: React.FC = () => {
  const { ledger, activeRole, t } = useEngine();

  const [selectedRecordForReplay, setSelectedRecordForReplay] = useState<DecisionRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredRecords = ledger.filter((r) => {
    const matchSearch =
      r.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchAction = filterAction === 'all' || r.operatorAction === filterAction;
    const matchRole = filterRole === 'all' || r.operatorRole === filterRole;

    return matchSearch && matchAction && matchRole;
  });

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/ledger/export?format=${format}`, '_blank');
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-teal-400" />
            {t('ledgerTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('ledgerSubtitle')}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('exportCsv')}</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('exportJson')}</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchLedger')}
            className="bg-transparent text-xs text-slate-200 outline-none w-full placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-mono text-[10px] uppercase">{t('filterAction')}:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer font-semibold"
            >
              <option value="all" className="bg-slate-900">{t('allActions')}</option>
              <option value="approve" className="bg-slate-900">{t('approveAction')}</option>
              <option value="override_approve" className="bg-slate-900">Physician Override</option>
              <option value="reject" className="bg-slate-900">{t('rejectAction')}</option>
              <option value="escalate" className="bg-slate-900">{t('escalateAction')}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-mono text-[10px] uppercase">{t('filterRole')}:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer font-semibold"
            >
              <option value="all" className="bg-slate-900">{t('allRoles')}</option>
              <option value="Operator" className="bg-slate-900">{t('roleOperator')}</option>
              <option value="Supervisor" className="bg-slate-900">{t('roleSupervisor')}</option>
              <option value="Administrator" className="bg-slate-900">{t('roleAdministrator')}</option>
              <option value="Auditor" className="bg-slate-900">{t('roleAuditor')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <History className="w-10 h-10 text-slate-700 mb-2" />
            <p className="text-xs font-semibold text-slate-400">No clinical decision records found matching filters.</p>
            <p className="text-[11px] text-slate-500 mt-1">Authorize or reject a clinical case order to record in audit ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                  <th className="py-3 px-4">Record ID / Timestamp</th>
                  <th className="py-3 px-4">Clinical Case & MRN</th>
                  <th className="py-3 px-4">Action & Role</th>
                  <th className="py-3 px-4">Authorized Protocol / Reason</th>
                  <th className="py-3 px-4">Simulated Risk Delta</th>
                  <th className="py-3 px-4 text-right">Audit Replay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRecords.map((rec) => {
                  const isApproved = rec.operatorAction === 'approve' || rec.operatorAction === 'override_approve';
                  const isReject = rec.operatorAction === 'reject';
                  const isEscalate = rec.operatorAction === 'escalate';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-slate-200 font-bold block">{rec.id}</span>
                        <span className="text-slate-500">{new Date(rec.timestamp).toLocaleTimeString()}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{rec.caseTitle}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          v{rec.stateVersion} · {rec.domainPackId}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                              isApproved
                                ? 'bg-teal-950/80 text-teal-300 border border-teal-800/80'
                                : isReject
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80'
                            }`}
                          >
                            {rec.operatorAction.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          By: {rec.operatorRole} ({rec.operatorId})
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-slate-200 font-semibold block truncate">
                          {rec.selectedAction?.name || 'Manual Review Action'}
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                          "{rec.reason}"
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {isApproved ? (
                          <span className="text-teal-400 font-bold">
                            -{rec.simulatedOutcome.projectedRiskReduction}% risk
                          </span>
                        ) : (
                          <span className="text-slate-500">Manual review</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedRecordForReplay(rec)}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-teal-300 font-mono text-xs font-semibold transition-colors"
                        >
                          {t('viewAuditReplay')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Replay Modal */}
      {selectedRecordForReplay && (
        <DecisionReplayModal
          record={selectedRecordForReplay}
          onClose={() => setSelectedRecordForReplay(null)}
        />
      )}
    </div>
  );
};
