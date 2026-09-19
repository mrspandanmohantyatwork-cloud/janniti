import React, { useMemo } from 'react';
import { CivicUpdate } from '../types';
import {
  Flame,
  Layers,
  ListOrdered,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Eye,
  Compass,
  Activity,
} from 'lucide-react';

interface ExtendedItem extends CivicUpdate {
  demandScore?: number;
  telemetryScore?: number;
  calculatedScore?: number;
  estimatedCost?: string;
}

interface ExecutiveCommandDashboardProps {
  updates: CivicUpdate[];
  allItems: ExtendedItem[];
  onNavigateTab: (tab: 'hotspots' | 'fusion' | 'ranking' | 'predictive' | 'portfolio' | 'audit') => void;
  onInspectDossier: (item: CivicUpdate) => void;
  onUpdateStatus: (id: string, newStatus: CivicUpdate['status']) => void;
  userRole?: string;
}

export const ExecutiveCommandDashboard: React.FC<ExecutiveCommandDashboardProps> = ({
  updates,
  allItems,
  onNavigateTab,
  onInspectDossier,
  onUpdateStatus,
  userRole,
}) => {
  // Compute High-Level Metrics
  const stats = useMemo(() => {
    const total = allItems.length;
    const resolved = allItems.filter((i) => i.status === 'resolved').length;
    const inProgress = allItems.filter((i) => i.status === 'in_progress').length;
    const reviewing = allItems.filter((i) => i.status === 'reviewing').length;
    const pending = allItems.filter((i) => i.status === 'pending').length;
    const urgent = allItems.filter((i) => (i.calculatedScore || 0) >= 80).length;

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Ward counts
    const wardMap: Record<string, number> = {};
    allItems.forEach((i) => {
      const w = i.ward || 'Bhubaneswar Central';
      wardMap[w] = (wardMap[w] || 0) + 1;
    });

    const topWards = Object.entries(wardMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      total,
      resolved,
      inProgress,
      reviewing,
      pending,
      urgent,
      resolutionRate,
      topWards,
    };
  }, [allItems]);

  // Top 5 urgent priority items
  const priorityItems = useMemo(() => {
    return [...allItems]
      .sort((a, b) => (b.calculatedScore || 0) - (a.calculatedScore || 0))
      .slice(0, 5);
  }, [allItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Command Header */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Executive Command Center
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live City Intelligence Sync
              </span>
              <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono">
                Bhubaneswar Municipal Corporation
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Civic Operations & Module Intelligence Summary
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Consolidated real-time operational overview synthesizing GIS demand hotspots, multi-source telemetry fusion, AI multi-criteria action rankings, predictive policy ROI, and capital works budget allocations.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={() => onNavigateTab('ranking')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
            >
              <ListOrdered className="w-4 h-4" />
              <span>Priority Action Queue ({stats.urgent})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 5 High-Level Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Reports */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:border-sky-400/50 transition-all">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Civic Petitions</span>
          </div>
          <div className="mt-2 text-2xl font-black text-[var(--text)] font-mono flex items-baseline gap-2">
            {stats.total}
            <span className="text-xs text-emerald-500 font-sans font-bold">
              {stats.resolutionRate}% closed
            </span>
          </div>
          <div className="mt-2 text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>{stats.resolved} Resolved</span>
            <span>{stats.inProgress} In-Progress</span>
          </div>
          <div className="w-full bg-[var(--border-color)] h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.resolutionRate}%` }}
            />
          </div>
        </div>

        {/* Card 2: Hotspot Clusters */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:border-amber-400/50 transition-all">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Demand Hotspots</span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            6 Zones
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">
            2 Critical Pressure Nodes
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-500 font-bold">
            <span>Unit-6 & Saheed Nagar</span>
          </div>
        </div>

        {/* Card 3: Triangulation Score */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:border-teal-400/50 transition-all">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-teal-500" />
            <span>Signal Triangulation</span>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            94.6%
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">
            Sensor Fusion Confidence
          </div>
          <div className="mt-1.5 text-[10px] text-teal-500 font-bold">
            Citizen vs Survey vs 311
          </div>
        </div>

        {/* Card 4: Urgent Actions */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:border-rose-400/50 transition-all">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Urgent Queue</span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {stats.urgent} Items
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">
            Multi-Criteria Score ≥ 80
          </div>
          <div className="mt-1.5 text-[10px] text-rose-500 font-bold">
            Immediate Action Required
          </div>
        </div>

        {/* Card 5: Capital Budget */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:border-purple-400/50 transition-all col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-purple-500" />
            <span>Capital Works Plan</span>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            $5.00M
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[var(--text-muted)]">
            $3.64M Allocated (72.8%)
          </div>
          <div className="mt-1.5 text-[10px] text-purple-500 font-bold">
            $1.36M Contingency Reserve
          </div>
        </div>
      </div>

      {/* Module-by-Module Summary Grid (6 Content Blocks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module 1: Demand Hotspots & Spatial Heatmap */}
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Demand Hotspots</h3>
                  <div className="text-[11px] text-[var(--text-muted)]">GIS Heatmap & Geospatial Clusters</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                ACTIVE GIS
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              Synthesizes real-time civic density coordinates across Bhubaneswar wards. Pinpoints high-severity infrastructure failure clusters to preempt compounding municipal hazards.
            </p>

            <div className="mt-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Unit-6 (Capital Hospital Road)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500">
                  98/100 • Critical
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  Saheed Nagar Commercial Node
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">
                  92/100 • High
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                  Rasulgarh Drainage Hub
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-500">
                  88/100 • Medium
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('hotspots')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-[var(--select-bg)] hover:bg-amber-500 hover:text-white text-[var(--text)] text-xs font-bold border border-[var(--border-color)] hover:border-amber-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Explore GIS Hotspots Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Module 2: Context & Sensor Fusion */}
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Context & Fusion</h3>
                  <div className="text-[11px] text-[var(--text-muted)]">3-Way Telemetry Triangulation</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                FUSED 94.6%
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              Cross-validates citizen grievances against official municipal ground staff surveys and 311 automated helpline telemetry to filter duplicates and verify severity.
            </p>

            {/* Emergency fast-track indicator if citizen marked emergency exists */}
            {allItems.some((i) => i.isEmergency || i.slaDeadline) && (
              <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/15 border border-rose-500/35 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                  <span className="font-bold text-rose-300">
                    {allItems.filter((i) => i.isEmergency || i.slaDeadline).length} Citizen Emergency Marked Issue{allItems.filter((i) => i.isEmergency || i.slaDeadline).length > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-md border border-rose-500/30">
                  24–48h SLA Active
                </span>
              </div>
            )}

            <div className="mt-3.5 space-y-2">
              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Citizen Grievance Feed</span>
                  <span className="font-bold text-sky-500">96.8% Congruence</span>
                </div>
                <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full w-[96.8%]" />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">BMC Ground Staff Surveys</span>
                  <span className="font-bold text-emerald-500">92.4% Verified</span>
                </div>
                <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[92.4%]" />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">311 Call Telemetry Logs</span>
                  <span className="font-bold text-indigo-500">89.1% Matched</span>
                </div>
                <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[89.1%]" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('fusion')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-[var(--select-bg)] hover:bg-sky-500 hover:text-white text-[var(--text)] text-xs font-bold border border-[var(--border-color)] hover:border-sky-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Triangulation Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Module 3: Priority Ranking Queue */}
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Priority Ranking</h3>
                  <div className="text-[11px] text-[var(--text-muted)]">AI Multi-Criteria Scoring</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                GEMINI 2.5
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              Objectively ranks civic petitions by safety hazard index, population impact, and infrastructure decay rather than raw complaint volume.
            </p>

            <div className="mt-3.5 space-y-2">
              {priorityItems.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onInspectDossier(item)}
                  className="flex items-center justify-between p-2 rounded-xl bg-[var(--item-hover)] hover:bg-emerald-500/10 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-[var(--text)] truncate flex items-center gap-1">
                        <span>{item.ward}</span>
                        {item.isEmergency && (
                          <span className="text-[9px] font-black text-rose-400 bg-rose-500/15 px-1 rounded">
                            🚨 24-48h
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{item.category}</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                    {item.calculatedScore}/100
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('ranking')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-[var(--select-bg)] hover:bg-emerald-500 hover:text-white text-[var(--text)] text-xs font-bold border border-[var(--border-color)] hover:border-emerald-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Open Priority Ranking Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Module 4: Predictive Impact & Counterfactual ROI */}
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Predictive Impact</h3>
                  <div className="text-[11px] text-[var(--text-muted)]">Counterfactual Policy ROI</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                PROJECTIONS
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              Forecasts civic satisfaction gains, public health hazard reductions, and municipal emergency response improvements for prioritized interventions.
            </p>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] text-center">
                <div className="text-base font-black text-emerald-500 font-mono">+38%</div>
                <div className="text-[10px] text-[var(--text-muted)] font-medium">Citizen Approval</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] text-center">
                <div className="text-base font-black text-sky-500 font-mono">-42%</div>
                <div className="text-[10px] text-[var(--text-muted)] font-medium">Response Latency</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] text-center">
                <div className="text-base font-black text-purple-500 font-mono">-61%</div>
                <div className="text-[10px] text-[var(--text-muted)] font-medium">Flood Overflow</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] text-center">
                <div className="text-base font-black text-amber-500 font-mono">3.8x</div>
                <div className="text-[10px] text-[var(--text-muted)] font-medium">CapEx ROI</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('predictive')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-[var(--select-bg)] hover:bg-purple-500 hover:text-white text-[var(--text)] text-xs font-bold border border-[var(--border-color)] hover:border-purple-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Simulate Policy Outcomes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Module 5: Portfolio Plan & Capital Budget */}
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Portfolio Plan</h3>
                  <div className="text-[11px] text-[var(--text-muted)]">Constrained Capital Budget</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                $5.00M BUDGET
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              Allocates fixed capital budgets to high-return infrastructure projects with knapsack optimization to maximize community impact.
            </p>

            <div className="mt-3.5 space-y-2">
              <div className="p-2.5 rounded-xl bg-[var(--item-hover)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text)]">Capital Budget Utilization</span>
                  <span className="font-bold text-pink-500 font-mono">$3.64M / $5.00M (72.8%)</span>
                </div>
                <div className="w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-full w-[72.8%]" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="text-[var(--text-muted)]">Selected Interventions</span>
                <span className="font-bold text-[var(--text)]">4 Works Approved</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="text-[var(--text-muted)]">Emergency Reserve Buffer</span>
                <span className="font-bold text-emerald-500 font-mono">$1.36M Remaining</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('portfolio')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-[var(--select-bg)] hover:bg-pink-500 hover:text-white text-[var(--text)] text-xs font-bold border border-[var(--border-color)] hover:border-pink-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Manage Capital Budget</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Module 6: Authority Security & Login Audit */}
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Authority Security</h3>
                  <div className="text-[11px] text-[var(--text-muted)]">Permanent Login Audit (SEC-43A)</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                OFFICERS ONLY
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
              Immutable server disk ledger recording all municipal officer credentials, biometric logins, and session events in compliance with municipal security standards.
            </p>

            <div className="mt-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="text-[var(--text-muted)]">Audit Ledger Status</span>
                <span className="font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tamper-Free SHA-256
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="text-[var(--text-muted)]">Excluded From Ledger</span>
                <span className="font-bold text-slate-400">Public Citizen Access</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[var(--item-hover)]">
                <span className="text-[var(--text-muted)]">Server Mirror Location</span>
                <span className="font-mono text-[10px] text-indigo-400">/permanent_login_audit.json</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('audit')}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-[var(--select-bg)] hover:bg-indigo-600 hover:text-white text-[var(--text)] text-xs font-bold border border-[var(--border-color)] hover:border-indigo-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Review Officer Audit Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Immediate Action Queue Table (Summary of Actionable Dossiers) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-base font-black text-[var(--text)] flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-emerald-500" />
              <span>Immediate Action Queue (Top Prioritized Civic Dossiers)</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time summary of urgent citizen grievances prioritized by AI multi-criteria risk index.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('ranking')}
            className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>View Full Ranking Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-black uppercase tracking-wider text-[10px] bg-[var(--item-hover)]">
                <th className="py-2.5 px-3">Rank / ID</th>
                <th className="py-2.5 px-3">Exact Location</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Urgency Score</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {priorityItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[var(--item-hover)] transition-colors">
                  <td className="py-3 px-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-[var(--text)] flex items-center gap-1 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{item.ward}</span>
                      {item.isEmergency && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/35 animate-pulse">
                          <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                          <span>Emergency (24-48h SLA)</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs mt-0.5">
                      {item.description}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {item.calculatedScore}/100
                      </span>
                      <div className="w-16 bg-[var(--border-color)] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${item.calculatedScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : item.status === 'in_progress'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-slate-500/15 text-slate-500'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onInspectDossier(item)}
                        className="p-1.5 rounded-lg bg-[var(--select-bg)] hover:bg-[var(--border-color)] text-[var(--text)] transition-colors cursor-pointer"
                        title="Inspect Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          onUpdateStatus(
                            item.id,
                            item.status === 'resolved' ? 'in_progress' : 'resolved'
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          item.status === 'resolved'
                            ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                      >
                        {item.status === 'resolved' ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
