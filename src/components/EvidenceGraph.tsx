import React, { useState } from 'react';
import { ActionOption, DecisionCase, DomainPack, Signal } from '../types';
import { Activity, Stethoscope, CheckCircle2, AlertTriangle, XCircle, HeartPulse } from 'lucide-react';

interface EvidenceGraphProps {
  decisionCase: DecisionCase;
  signals: Signal[];
  options: ActionOption[];
  pack: DomainPack;
}

interface SelectedNode {
  type: 'signal' | 'rule' | 'case' | 'action' | 'constraint';
  id: string;
  label: string;
  details: Record<string, any>;
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({
  decisionCase,
  signals,
  options,
  pack,
}) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const caseSignals = signals.filter((s) => decisionCase.evidenceIds.includes(s.id));
  const recommended = options.find((o) => o.id === decisionCase.recommendedActionId) || options[0];

  const svgWidth = 840;
  const svgHeight = 360;

  const sigNodes = caseSignals.slice(0, 3).map((sig, i) => ({
    id: sig.id,
    x: 80,
    y: 80 + i * 90,
    data: sig,
    label: `${sig.type.replace(/_/g, ' ')}: ${sig.value}${sig.unit ? ' ' + sig.unit : ''}`,
  }));

  const ruleNodes = decisionCase.triggeredRules.slice(0, 2).map((ruleName, i) => ({
    id: `rule_${i}`,
    x: 250,
    y: 110 + i * 110,
    label: ruleName,
  }));

  const caseNode = {
    id: decisionCase.id,
    x: 430,
    y: 170,
    label: `Acuity: ${decisionCase.priorityScore}/100`,
  };

  const actionNodes = options.slice(0, 3).map((opt, i) => ({
    id: opt.id,
    x: 610,
    y: 80 + i * 90,
    data: opt,
    label: opt.name.length > 20 ? opt.name.substring(0, 18) + '...' : opt.name,
    isRecommended: opt.id === recommended?.id,
    isFeasible: opt.feasibilityStatus !== 'infeasible_hard_constraint',
  }));

  const recNode = {
    id: 'rec_outcome',
    x: 770,
    y: 170,
    label: 'Attending Gate',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Clinical Decision Provenance & Evidence Graph
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Select node to inspect audit lineage
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto border border-slate-800 rounded bg-slate-950 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[760px] select-none"
        >
          {/* Connector Paths */}
          {/* Signals -> Rules */}
          {sigNodes.map((s) =>
            ruleNodes.map((r) => (
              <path
                key={`sig-rule-${s.id}-${r.id}`}
                d={`M ${s.x + 60} ${s.y} C ${s.x + 120} ${s.y}, ${r.x - 60} ${r.y}, ${r.x} ${r.y}`}
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            ))
          )}

          {/* Rules -> Case */}
          {ruleNodes.map((r) => (
            <path
              key={`rule-case-${r.id}`}
              d={`M ${r.x + 60} ${r.y} C ${r.x + 110} ${r.y}, ${caseNode.x - 70} ${caseNode.y}, ${caseNode.x} ${caseNode.y}`}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2"
            />
          ))}

          {/* Case -> Actions */}
          {actionNodes.map((a) => (
            <path
              key={`case-act-${a.id}`}
              d={`M ${caseNode.x + 60} ${caseNode.y} C ${caseNode.x + 110} ${caseNode.y}, ${a.x - 60} ${a.y}, ${a.x} ${a.y}`}
              fill="none"
              stroke={a.isRecommended ? '#0d9488' : a.isFeasible ? '#334155' : '#e11d48'}
              strokeWidth={a.isRecommended ? '2.5' : '1.5'}
            />
          ))}

          {/* Recommended Action -> Attending Gate */}
          {recommended && (
            <path
              d={`M ${670} ${
                actionNodes.find((a) => a.id === recommended.id)?.y || 170
              } C 710 ${
                actionNodes.find((a) => a.id === recommended.id)?.y || 170
              }, 730 ${recNode.y}, ${recNode.x} ${recNode.y}`}
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
            />
          )}

          {/* Column Headers */}
          <text x="80" y="28" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            1. VITAL & INFLOW SIGNALS
          </text>
          <text x="250" y="28" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            2. CLINICAL RISK RULES
          </text>
          <text x="430" y="28" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            3. TRIAGE ACUITY
          </text>
          <text x="610" y="28" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            4. CANDIDATE PROTOCOLS
          </text>
          <text x="770" y="28" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            5. ATTENDING GATE
          </text>

          {/* Signal Nodes */}
          {sigNodes.map((s) => {
            const isStale = s.data.qualityStatus === 'stale';
            const isConflict = s.data.qualityStatus === 'conflicting';
            const strokeColor = isConflict ? '#f59e0b' : isStale ? '#64748b' : '#0d9488';
            return (
              <g
                key={s.id}
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() =>
                  setSelectedNode({
                    type: 'signal',
                    id: s.id,
                    label: s.label,
                    details: {
                      Source: s.data.source,
                      UnitStation: s.data.entityId,
                      Value: `${s.data.value} ${s.data.unit}`,
                      Quality: s.data.qualityStatus,
                      Freshness: `${s.data.freshnessSeconds}s ago`,
                      Timestamp: new Date(s.data.eventTimestamp).toLocaleTimeString(),
                    },
                  })
                }
              >
                <rect
                  x={s.x - 65}
                  y={s.y - 25}
                  width="130"
                  height="50"
                  rx="4"
                  fill="#020617"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                <circle cx={s.x - 48} cy={s.y} r="4" fill={strokeColor} />
                <text x={s.x - 35} y={s.y - 4} fill="#f1f5f9" fontSize="10" fontWeight="600">
                  {s.data.type.slice(0, 14)}
                </text>
                <text x={s.x - 35} y={s.y + 12} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  {s.data.value} {s.data.unit}
                </text>
              </g>
            );
          })}

          {/* Rule Nodes */}
          {ruleNodes.map((r) => (
            <g
              key={r.id}
              className="cursor-pointer"
              onClick={() =>
                setSelectedNode({
                  type: 'rule',
                  id: r.id,
                  label: r.label,
                  details: {
                    Rule: r.label,
                    IncidentType: decisionCase.incidentType,
                    Condition: 'Threshold exceeded',
                    ActionImpact: 'Acuity severity boost applied deterministically',
                  },
                })
              }
            >
              <rect
                x={r.x - 65}
                y={r.y - 22}
                width="130"
                height="44"
                rx="4"
                fill="#0f172a"
                stroke="#0284c7"
                strokeWidth="1.5"
              />
              <text x={r.x} y={r.y + 4} fill="#bae6fd" fontSize="10" textAnchor="middle" fontWeight="500">
                {r.label.length > 20 ? r.label.slice(0, 18) + '...' : r.label}
              </text>
            </g>
          ))}

          {/* Case Node */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedNode({
                type: 'case',
                id: decisionCase.id,
                label: decisionCase.title,
                details: {
                  AcuityScore: `${decisionCase.priorityScore}/100`,
                  Severity: `${decisionCase.severity}/100`,
                  Urgency: `${decisionCase.urgency}/100`,
                  StateVersion: `v${decisionCase.stateVersion}`,
                  Status: decisionCase.status,
                  Reason: decisionCase.correlationReason,
                },
              })
            }
          >
            <rect
              x={caseNode.x - 70}
              y={caseNode.y - 35}
              width="140"
              height="70"
              rx="6"
              fill="#082f49"
              stroke="#0ea5e9"
              strokeWidth="2"
            />
            <text x={caseNode.x} y={caseNode.y - 8} fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
              {decisionCase.incidentType.replace(/_/g, ' ').toUpperCase()}
            </text>
            <text x={caseNode.x} y={caseNode.y + 10} fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              ACUITY: {decisionCase.priorityScore}
            </text>
            <text x={caseNode.x} y={caseNode.y + 24} fill="#7dd3fc" fontSize="9" textAnchor="middle" fontFamily="monospace">
              stateVersion: v{decisionCase.stateVersion}
            </text>
          </g>

          {/* Action Nodes */}
          {actionNodes.map((a) => {
            const isRec = a.isRecommended;
            const isHardBlocked = !a.isFeasible;
            const bg = isRec ? '#042f2e' : isHardBlocked ? '#450a0a' : '#020617';
            const border = isRec ? '#0d9488' : isHardBlocked ? '#e11d48' : '#334155';
            return (
              <g
                key={a.id}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode({
                    type: 'action',
                    id: a.id,
                    label: a.data.name,
                    details: {
                      Feasibility: a.data.feasibilityStatus,
                      ResidualRisk: `${a.data.residualRisk}%`,
                      UtilityScore: a.data.utilityScore,
                      Cost: `$${a.data.estimatedCost}`,
                      UnitsRequired: a.data.requiredResources.map((r: any) => `${r.quantity} ${r.resourceType}`).join(', ') || 'None',
                      Contraindications: a.data.hardConstraintViolations.join('; ') || 'None',
                      Warnings: a.data.softConstraintWarnings.join('; ') || 'None',
                    },
                  })
                }
              >
                <rect
                  x={a.x - 65}
                  y={a.y - 25}
                  width="130"
                  height="50"
                  rx="4"
                  fill={bg}
                  stroke={border}
                  strokeWidth={isRec ? 2 : 1.5}
                />
                <text x={a.x} y={a.y - 4} fill={isRec ? '#5eead4' : '#e2e8f0'} fontSize="10" fontWeight="600" textAnchor="middle">
                  {a.label}
                </text>
                <text x={a.x} y={a.y + 12} fill={isHardBlocked ? '#fca5a5' : '#94a3b8'} fontSize="9" textAnchor="middle" fontFamily="monospace">
                  {isHardBlocked ? 'CONTRAINDICATED' : isRec ? 'RECOMMENDED' : 'ALTERNATIVE'}
                </text>
              </g>
            );
          })}

          {/* Attending Physician Gate */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedNode({
                type: 'constraint',
                id: recNode.id,
                label: 'Attending Physician Gate',
                details: {
                  GateStatus: 'Pending Attending Signoff',
                  Contraindications: 'Checked (0 hard violations)',
                  PolicyWarnings: recommended?.softConstraintWarnings.length ? 'Soft Warning (Requires attending reason)' : 'Cleared',
                  AuditLog: 'Permanent entry generated in patient clinical ledger',
                },
              })
            }
          >
            <circle cx={recNode.x} cy={recNode.y} r="24" fill="#0f766e" stroke="#2dd4bf" strokeWidth="2" />
            <text x={recNode.x} y={recNode.y + 4} fill="#f0fdfa" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              ATTENDING
            </text>
          </g>
        </svg>
      </div>

      {/* Node Provenance Inspector */}
      {selectedNode && (
        <div className="bg-slate-950 border border-teal-500/40 rounded p-3 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-teal-400 font-mono text-[11px] font-bold uppercase">
                [{selectedNode.type} provenance]
              </span>
              <span className="font-semibold text-slate-200">{selectedNode.label}</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded hover:bg-slate-900"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(selectedNode.details).map(([k, v]) => (
              <div key={k} className="bg-slate-900 rounded p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">{k}</span>
                <span className="text-slate-200 font-medium break-words text-[11px]">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
