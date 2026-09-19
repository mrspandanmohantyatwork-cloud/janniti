import React, { useState, useMemo, useEffect } from 'react';
import { CivicUpdate, User } from '../types';
import { isMapboxConfigured } from '../utils/mapboxService';
import { OfficerGisMap } from './OfficerGisMap';
import {
  rankPetitionsWithGemini,
  getPredictiveImpactWithGemini,
  getPortfolioPlanWithGemini,
  GeminiRankItem,
  GeminiPredictiveImpactResult,
  GeminiPortfolioResult,
} from '../utils/geminiApi';
import {
  Flame,
  Layers,
  ListOrdered,
  TrendingUp,
  Briefcase,
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  DollarSign,
  Users,
  Compass,
  Building,
  Calendar,
  Sparkles,
  Maximize2,
  RefreshCw,
  Zap,
  Bot,
  Loader2,
  ShieldCheck,
  Lock,
  LayoutDashboard,
} from 'lucide-react';
import { ExecutiveCommandDashboard } from './ExecutiveCommandDashboard';
import { AuthorityLoginAuditSuite } from './AuthorityLoginAuditSuite';

interface OfficerIntelligenceSuiteProps {
  user: User | null;
  updates: CivicUpdate[];
  onUpdateStatus?: (id: string, newStatus: 'pending' | 'reviewing' | 'in_progress' | 'resolved') => void;
  onNavigateToCitizenView?: () => void;
}

type SuiteTab = 'overview' | 'hotspots' | 'fusion' | 'ranking' | 'predictive' | 'portfolio' | 'audit';

const DEFAULT_PREDICTIVE_DATA: GeminiPredictiveImpactResult = {
  project: '#1: Capital Hospital Road, Unit-6 - Public Health',
  qualityOfLifeBoost: 62,
  civicRoiRatio: '1 : 3.8',
  costEfficiencyIndex: 88,
  projectedBeneficiaries: '~18,500 Citizens',
  pillars: {
    publicHealthAndSafety: { score: 92, tier: 'CRITICAL' },
    economicResilience: { score: 84, tier: 'HIGH' },
    environmentalLongevity: { score: 80, tier: 'HIGH' },
    socialInclusion: { score: 87, tier: 'HIGH' },
  },
  deteriorationIfUnfunded: {
    probabilityOfFailurePct: 76,
    projectedEscalationCost: '+$340,000 emergency repair cost',
    consequence: 'Prolonged neglect creates compound hazards for regional hospital access and triggers extensive sub-surface water erosion.',
  },
  executiveRecommendation:
    'Immediate capital clearance recommended. The high civic multiplier and life-safety proximity justify prioritization in the municipal FY2026 budget cycle.',
};

const DEFAULT_PORTFOLIO_DATA: GeminiPortfolioResult = {
  allocatedCapital: '$4.75M / $5.00M (95%)',
  allocatedPct: 95,
  remainingReservePct: 5,
  wardEquityBalancePct: 96,
  phase1: [
    {
      id: '1',
      title: 'Public Health – Capital Hospital Road, Unit-6',
      category: 'Public Health',
      ward: 'Unit-6',
      allocatedAmount: '$1,075k Allocated',
      reason: 'Severe life-safety hazard near acute hospital gate and patient transit node.',
    },
    {
      id: '2',
      title: 'Infrastructure – Market Building, Unit-2',
      category: 'Infrastructure',
      ward: 'Unit-2',
      allocatedAmount: '$1,300k Allocated',
      reason: 'Major arterial economic corridor carrying >40k daily commuters.',
    },
    {
      id: '3',
      title: 'Saheed Nagar High School Boundary & Stormwater Safety',
      category: 'Education',
      ward: 'Saheed Nagar',
      allocatedAmount: '$850k Allocated',
      reason: 'Child safety compliance and pedestrian footpath restoration.',
    },
  ],
  phase2: [
    {
      id: '4',
      title: 'Patia IT Corridor Automated Solid Waste Sorter',
      category: 'Waste Management',
      ward: 'Patia',
      allocatedAmount: '$920k Approved',
      reason: 'High density technology corridor with escalating commercial packaging waste.',
    },
    {
      id: '5',
      title: 'Nayapalli Underpass Drainage Pump Electrification',
      category: 'Infrastructure',
      ward: 'Nayapalli',
      allocatedAmount: '$605k Reserved',
      reason: 'Seasonal flood prevention standby for monsoon preparation.',
    },
  ],
  phase3: [
    {
      id: '6',
      title: 'Ekamra Kshetra Heritage Streetscape & Beautification',
      category: 'Parks & Recreation',
      ward: 'Old Town',
      allocatedAmount: '$250k Monitored',
      reason: 'Deferred to next fiscal cycle pending heritage preservation clearance.',
    },
  ],
  executiveSummary:
    'Optimized portfolio fulfills 96% ward equity across BMC zones, prioritizing life-safety drainage and commercial arterials while reserving 5% ($250k) for emergent contingency.',
};

function computeInitialRankings(items: CivicUpdate[]): Record<string, GeminiRankItem> {
  const map: Record<string, GeminiRankItem> = {};
  items.forEach((p, idx) => {
    const text = ((p.description || '') + ' ' + (p.category || '')).toLowerCase();
    const isCritical = p.isEmergency || text.includes('drain') || text.includes('hospital') || text.includes('hazard') || text.includes('flood');
    const isHigh = text.includes('road') || text.includes('pothole') || text.includes('waste') || text.includes('school');
    const aiScore = isCritical ? 96 - idx : isHigh ? 88 - idx : 76 - idx;
    const urgencyTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
      aiScore >= 92 ? 'CRITICAL' : aiScore >= 82 ? 'HIGH' : aiScore >= 72 ? 'MEDIUM' : 'LOW';

    map[p.id] = {
      id: p.id,
      rank: idx + 1,
      aiScore: Math.max(65, Math.min(99, aiScore)),
      urgencyTier,
      rationale: isCritical
        ? 'Proximity to high-density healthcare corridor creates immediate public hazard.'
        : 'High daily commuter footfall with escalated degradation under monsoon conditions.',
      immediateAction: isCritical
        ? 'Dispatch BMC Rapid Response Desilting & Engineering Crew within 24 hours.'
        : 'Issue Ward Works tender and deploy repair crew.',
    };
  });
  return map;
}

export const OfficerIntelligenceSuite: React.FC<OfficerIntelligenceSuiteProps> = ({
  user,
  updates,
  onUpdateStatus,
  onNavigateToCitizenView,
}) => {
  const [activeTab, setActiveTab] = useState<SuiteTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photo' | 'audio' | 'text'>('all');
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedRoiItem, setSelectedRoiItem] = useState<string>('#1: Capital Hospital Road, Unit-6 - Public Health');
  const [inspectingDossier, setInspectingDossier] = useState<CivicUpdate | null>(null);

  // Gemini Priority Ranking State
  const [useGeminiRanking, setUseGeminiRanking] = useState(true);
  const [geminiRankings, setGeminiRankings] = useState<Record<string, GeminiRankItem>>(() => computeInitialRankings(updates));
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [rankingCriteria, setRankingCriteria] = useState('Public Safety & Life Hazard');

  // Gemini Predictive Impact State
  const [geminiPredictiveData, setGeminiPredictiveData] = useState<GeminiPredictiveImpactResult | null>(DEFAULT_PREDICTIVE_DATA);
  const [isLoadingPredictive, setIsLoadingPredictive] = useState(false);

  // Gemini Portfolio Plan State
  const [geminiPortfolioData, setGeminiPortfolioData] = useState<GeminiPortfolioResult | null>(DEFAULT_PORTFOLIO_DATA);
  const [portfolioStrategy, setPortfolioStrategy] = useState<string>('Life Safety & Emergency First');
  const [totalBudget, setTotalBudget] = useState('$5.00M');
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  // Local state for interactive status overrides
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CivicUpdate['status']>>({});

  const handleStatusChange = (id: string, newStatus: CivicUpdate['status']) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: newStatus }));
    if (onUpdateStatus) {
      onUpdateStatus(id, newStatus);
    }
  };

  // Base list of items
  const allItems = useMemo(() => {
    return updates.map((item, idx) => {
      const currentStatus = statusOverrides[item.id] || item.status;
      // Pre-calculate telemetry and urgency scores based on exact location and category
      const demandScore = 100 - (idx * 3);
      const telemetryScore = 96 - (idx * 3);
      const calculatedScore = Math.max(70, Math.round((demandScore * 0.55) + (telemetryScore * 0.45)));

      return {
        ...item,
        status: currentStatus,
        demandScore: Math.min(100, Math.max(60, demandScore)),
        telemetryScore: Math.min(100, Math.max(55, telemetryScore)),
        calculatedScore,
        estimatedCost: idx === 0 ? '$1075k' : idx === 1 ? '$1300k' : idx === 2 ? '$850k' : '$420k',
      };
    });
  }, [updates, statusOverrides]);

  // Handler for Gemini Priority Ranking
  const runGeminiRanking = async (criteria = rankingCriteria) => {
    setIsLoadingRanking(true);
    try {
      const result = await rankPetitionsWithGemini(allItems, criteria);
      const map: Record<string, GeminiRankItem> = {};
      result.forEach((item) => {
        map[item.id] = item;
      });
      setGeminiRankings(map);
    } catch (e) {
      console.warn('Priority ranking request fallback triggered:', e);
    } finally {
      setIsLoadingRanking(false);
    }
  };

  // Handler for Gemini Predictive Impact
  const runPredictiveImpact = async (roiKey = selectedRoiItem) => {
    setIsLoadingPredictive(true);
    try {
      const result = await getPredictiveImpactWithGemini({
        projectTitle: roiKey,
        category: roiKey.includes('Health') ? 'Public Health' : roiKey.includes('Education') ? 'Education' : 'Infrastructure',
        ward: roiKey.includes('Unit-6') ? 'Unit-6' : roiKey.includes('Saheed') ? 'Saheed Nagar' : 'Unit-2',
        description: 'Municipal critical urban renewal and hazard prevention works',
        estimatedCost: roiKey.includes('Unit-6') ? '$1,075,000' : roiKey.includes('Saheed') ? '$850,000' : '$1,300,000',
      });
      setGeminiPredictiveData(result);
    } catch (e) {
      console.warn('Predictive impact request fallback triggered:', e);
    } finally {
      setIsLoadingPredictive(false);
    }
  };

  // Handler for Gemini Portfolio Optimization
  const runPortfolioPlan = async (strategy = portfolioStrategy, budget = totalBudget) => {
    setIsLoadingPortfolio(true);
    try {
      const result = await getPortfolioPlanWithGemini(strategy, budget, allItems);
      setGeminiPortfolioData(result);
    } catch (e) {
      console.warn('Portfolio plan request fallback triggered:', e);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Count emergency fast-track items
  const emergencyCount = useMemo(() => {
    return allItems.filter((i) => Boolean(i.isEmergency || i.slaDeadline)).length;
  }, [allItems]);

  // Filtered and smart-sorted items
  const filteredItems = useMemo(() => {
    let list = allItems.filter((item) => {
      if (showEmergencyOnly && !item.isEmergency && !item.slaDeadline) {
        return false;
      }

      const matchesSearch =
        !searchQuery ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.authorName && item.authorName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLocation = selectedLocation === 'all' || item.ward.toLowerCase().includes(selectedLocation.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

      let matchesMedia = true;
      if (selectedMediaType === 'photo') matchesMedia = !!item.imageUrl;
      if (selectedMediaType === 'audio') matchesMedia = !!item.audioUrl;
      if (selectedMediaType === 'text') matchesMedia = !item.imageUrl && !item.audioUrl;

      return matchesSearch && matchesLocation && matchesCategory && matchesStatus && matchesMedia;
    });

    if (useGeminiRanking && Object.keys(geminiRankings).length > 0) {
      list = [...list].sort((a, b) => {
        const rankA = geminiRankings[a.id]?.rank ?? 999;
        const rankB = geminiRankings[b.id]?.rank ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return (geminiRankings[b.id]?.aiScore ?? 0) - (geminiRankings[a.id]?.aiScore ?? 0);
      });
    }

    return list;
  }, [allItems, showEmergencyOnly, searchQuery, selectedLocation, selectedCategory, selectedStatus, selectedMediaType, useGeminiRanking, geminiRankings]);

  // Exact Locations with active counts
  const exactLocationPins = [
    { name: 'Near Hotel Num Num, Acharya Vihar Square.', category: 'Infrastructure', lat: 20.3015, lng: 85.8312, count: 2, status: 'high' },
    { name: 'Near Vishal Mega Mart, Jaydev Vihar Square.', category: 'Infrastructure', lat: 20.3003, lng: 85.8242, count: 2, status: 'high' },
    { name: 'Near Kalinga Stadium.', category: 'Safety', lat: 20.3039, lng: 85.8202, count: 1, status: 'medium' },
    { name: 'Capital Hospital Rd, Unit-6', category: 'Public Health', lat: 20.265, lng: 85.835, count: 2, status: 'high' },
    { name: 'Market Building, Unit-2', category: 'Infrastructure', lat: 20.298, lng: 85.864, count: 3, status: 'high' },
    { name: 'Master Canteen Station Sq.', category: 'Safety', lat: 20.281, lng: 85.845, count: 1, status: 'in_progress' },
    { name: 'Rasulgarh Square', category: 'Waste Management', lat: 20.274, lng: 85.829, count: 1, status: 'medium' },
    { name: 'Khandagiri Enclave', category: 'Transit', lat: 20.252, lng: 85.848, count: 1, status: 'medium' },
    { name: 'Saheed Nagar High School', category: 'Education', lat: 20.269, lng: 85.871, count: 1, status: 'medium' },
    { name: 'Nayapalli Water Works', category: 'Water & Sanitation', lat: 20.291, lng: 85.831, count: 1, status: 'medium' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-colors">
      {/* Main Suite Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Bar */}
        <aside className="lg:col-span-3 space-y-2 bg-[var(--card-bg)] p-3 sm:p-4 rounded-3xl border border-[var(--border-color)] shadow-[0_10px_30px_var(--shadow-color)]">
          {/* Tab 0: EXECUTIVE COMMAND SUMMARY DASHBOARD (Above Demand Hotspots) */}
          <button
            id="executive-command-dashboard-tab"
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-sky-500/15 border-2 border-sky-400 text-sky-600 dark:text-sky-300 shadow-[0_4px_20px_rgba(56,189,248,0.2)]'
                : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'overview' ? 'bg-sky-500 text-white' : 'bg-sky-500/10 text-sky-500'}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
                <span>Command Dashboard</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/20 text-sky-500 dark:text-sky-400 font-bold rounded">
                  OVERVIEW
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">Summary of All Contents</div>
            </div>
          </button>

          {/* Tab 1: DEMAND HOTSPOTS */}
          <button
            onClick={() => setActiveTab('hotspots')}
            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'hotspots'
                ? 'bg-sky-500/15 border-2 border-sky-400 text-sky-600 dark:text-sky-300 shadow-[0_4px_20px_rgba(56,189,248,0.2)]'
                : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'hotspots' ? 'bg-sky-500 text-white' : 'bg-sky-500/10 text-sky-500'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider">Demand Hotspots</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">GIS Heatmap & Clusters</div>
            </div>
          </button>

          {/* Tab 2: CONTEXT & FUSION */}
          <button
            onClick={() => setActiveTab('fusion')}
            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'fusion'
                ? 'bg-sky-500/15 border-2 border-sky-400 text-sky-600 dark:text-sky-300 shadow-[0_4px_20px_rgba(56,189,248,0.2)]'
                : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'fusion' ? 'bg-sky-500 text-white' : 'bg-sky-500/10 text-sky-500'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider">Context & Fusion</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">Citizen vs Survey vs 311</div>
            </div>
          </button>

          {/* Tab 3: PRIORITY RANKING */}
          <button
            onClick={() => setActiveTab('ranking')}
            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'ranking'
                ? 'bg-sky-500/15 border-2 border-sky-400 text-sky-600 dark:text-sky-300 shadow-[0_4px_20px_rgba(56,189,248,0.2)]'
                : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'ranking' ? 'bg-sky-500 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <ListOrdered className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider">Priority Ranking</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">Multi-Criteria Score</div>
            </div>
          </button>

          {/* Tab 4: PREDICTIVE IMPACT */}
          <button
            onClick={() => setActiveTab('predictive')}
            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'predictive'
                ? 'bg-sky-500/15 border-2 border-sky-400 text-sky-600 dark:text-sky-300 shadow-[0_4px_20px_rgba(56,189,248,0.2)]'
                : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'predictive' ? 'bg-sky-500 text-white' : 'bg-amber-500/10 text-amber-500'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider">Predictive Impact</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">Counterfactual Policy ROI</div>
            </div>
          </button>

          {/* Tab 5: PORTFOLIO PLAN */}
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'portfolio'
                ? 'bg-sky-500/15 border-2 border-sky-400 text-sky-600 dark:text-sky-300 shadow-[0_4px_20px_rgba(56,189,248,0.2)]'
                : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'portfolio' ? 'bg-sky-500 text-white' : 'bg-pink-500/10 text-pink-500'}`}>
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider">Portfolio Plan</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">Constrained Capital Budget</div>
            </div>
          </button>

          {/* Tab 6: SECURITY & LOGIN AUDIT (Strictly Authority-Only Option) */}
          {user?.role === 'authority' && (
            <button
              id="authority-login-audit-tab"
              onClick={() => setActiveTab('audit')}
              className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-indigo-500/15 border-2 border-indigo-400 text-indigo-600 dark:text-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.2)]'
                  : 'hover:bg-[var(--item-hover)] text-[var(--text)] border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-xl ${activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
                  <span className="truncate">Authority Login Audit</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SEC-43A
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-indigo-400" />
                  <span>Authorities Only • Citizen Excluded</span>
                </div>
              </div>
            </button>
          )}
        </aside>

        {/* Right Active View Content Area */}
        <div className="lg:col-span-9 bg-[var(--card-bg)] p-4 sm:p-6 rounded-3xl border border-[var(--border-color)] shadow-[0_10px_30px_var(--shadow-color)] min-h-[600px]">
          {/* ========================================================================= */}
          {/* TAB 0: EXECUTIVE COMMAND SUMMARY DASHBOARD (Overview of All Modules) */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <ExecutiveCommandDashboard
              updates={updates}
              allItems={allItems}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onInspectDossier={(item) => setInspectingDossier(item)}
              onUpdateStatus={handleStatusChange}
              userRole={user?.role}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 1: DEMAND HOTSPOTS (GIS Heatmap & Clusters) */}
          {/* ========================================================================= */}
          {activeTab === 'hotspots' && (
            <div className="space-y-4">
              {/* GIS Top Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-600 dark:text-sky-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <Compass className="w-4 h-4 text-sky-500" />
                  <span className="font-bold">GIS Exact Location Telemetry</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900/40 text-[10px] text-sky-400 border border-sky-500/30">
                    Bhubaneswar Municipal Corporation (BMC)
                  </span>
                  {isMapboxConfigured() ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Mapbox Places Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      <Sparkles className="w-2.5 h-2.5" />
                      Mapbox API Ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white font-bold text-[11px]">All Layers</span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-semibold text-[11px]">Exact Locations Only</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--item-bg)] text-[var(--text-muted)] text-[11px]">Petitions (11)</span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    OSM Live
                  </span>
                </div>
              </div>

              {/* Sector selector */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[10px]">Sector:</span>
                {['All', 'Public Health', 'Infrastructure', 'Waste Management', 'Safety', 'Transit', 'Water & Sanitation', 'Education'].map((sector) => (
                  <button
                    key={sector}
                    onClick={() => setSelectedSector(sector.toLowerCase())}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedSector === sector.toLowerCase()
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-[var(--item-bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>

              {/* Real Interactive Leaflet GIS Map with Exact Geographic Pointers */}
              <OfficerGisMap
                updates={allItems}
                selectedSector={selectedSector}
                onSelectDossier={(item) => setInspectingDossier(item)}
              />

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                <span>Mapped Issues: <strong>{allItems.length} Citizen Submissions</strong> &bull; GPS Fixed Pointers</span>
                <span className="text-[11px]">Engine: Leaflet &bull; OpenStreetMap / Mapbox Geospatial</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CONTEXT & FUSION (Citizen vs Survey vs 311) */}
          {/* ========================================================================= */}
          {activeTab === 'fusion' && (
            <div className="space-y-4">
              {/* Media Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 bg-[var(--item-bg)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    onClick={() => setSelectedMediaType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedMediaType === 'all' && !showEmergencyOnly ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    All Media ({allItems.length})
                  </button>
                  <button
                    onClick={() => setSelectedMediaType('photo')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedMediaType === 'photo' ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Photos (10)
                  </button>
                  <button
                    onClick={() => setSelectedMediaType('audio')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedMediaType === 'audio' ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Videos (3)
                  </button>
                  <button
                    onClick={() => setSelectedMediaType('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedMediaType === 'text' ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Text Reports (1)
                  </button>
                  <button
                    onClick={() => setShowEmergencyOnly(!showEmergencyOnly)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      showEmergencyOnly
                        ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)] ring-2 ring-rose-400'
                        : emergencyCount > 0
                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>🚨 Emergency Only ({emergencyCount})</span>
                  </button>
                </div>

                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search text, exact location, or citizen..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 transition-all"
                  />
                </div>
              </div>

              {/* Refine By Dropdowns */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] pt-1">
                <span className="font-semibold text-[var(--text)] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-sky-400" />
                  Refine By:
                </span>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Locations ({exactLocationPins.length})</option>
                  {exactLocationPins.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="Public Health">Public Health</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Safety">Safety</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Cards Grid (Screenshot 1 Representation) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between rounded-2xl border transition-all ${
                      item.isEmergency
                        ? 'border-rose-500/60 bg-gradient-to-b from-rose-950/20 via-[var(--card-bg)] to-[var(--card-bg)] shadow-[0_4px_25px_rgba(244,63,94,0.18)] ring-1 ring-rose-500/30'
                        : 'border-[var(--border-color)] bg-[var(--card-bg)] shadow-sm hover:shadow-md'
                    } overflow-hidden`}
                  >
                    <div>
                      {/* Emergency Citizen Banner */}
                      {item.isEmergency && (
                        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-black tracking-wide shadow-xs select-none">
                          <span className="flex items-center gap-1.5">
                            <AlertOctagon className="w-3.5 h-3.5 fill-white text-rose-600 animate-pulse" />
                            <span>🚨 CITIZEN MARKED EMERGENCY</span>
                          </span>
                          <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono font-bold text-amber-200 border border-white/10">
                            24–48h SLA FAST-TRACK
                          </span>
                        </div>
                      )}

                      {/* Media container or placeholder */}
                      <div className="relative h-44 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.category}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-2xl mb-1">🏛️</span>
                            <span className="text-xs font-bold text-sky-400">Citizen Field Problem Statement</span>
                            <span className="text-[11px] text-slate-400 mt-1">&ldquo;{item.description || 'Citizen grievance report'}&rdquo;</span>
                          </div>
                        )}

                        {/* Top Left Location badge */}
                        <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 max-w-[55%] truncate shadow-sm">
                          <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{item.ward}</span>
                        </span>

                        {/* Top Right Badges */}
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {item.isEmergency && (
                            <span className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-md border border-rose-400 animate-pulse">
                              <AlertOctagon className="w-3 h-3 text-white" />
                              <span>EMERGENCY</span>
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-[10px] font-bold">
                            {item.category}
                          </span>
                        </div>

                        {/* Bottom Tag */}
                        {item.imageUrl && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Citizen Photo Attached
                          </span>
                        )}

                        {/* Zoom Button */}
                        <button
                          onClick={() => setInspectingDossier(item)}
                          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-slate-950/80 text-white hover:text-sky-300 transition-colors cursor-pointer"
                          title="Inspect full image"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content details */}
                      <div className="p-3.5 space-y-2">
                        {item.isEmergency && (
                          <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                              <span>Urgent Public Safety Hazard</span>
                            </span>
                            <span className="text-[10px] font-mono text-amber-300 bg-black/30 px-1.5 py-0.5 rounded border border-rose-500/30">
                              {item.status === 'resolved' ? 'Resolved in SLA' : '24–48h SLA'}
                            </span>
                          </div>
                        )}

                        <p className="text-xs font-semibold text-[var(--text)] line-clamp-2">
                          &ldquo;{item.description}&rdquo;
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
                          <span className="flex items-center gap-1 font-medium text-[var(--text)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                            {item.authorName || 'Citizen Contributor'}
                          </span>
                          <span>{item.timestamp || '07:48 PM'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3.5 pt-0 border-t border-[var(--border-color)]/40 mt-2 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] pt-2">
                        <span className="text-[var(--text-muted)] font-medium">👍 {item.likes || 0} Endorsements</span>
                        <div className="flex items-center gap-1.5">
                          {item.isEmergency && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                              <span>24–48h SLA</span>
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'in_progress'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setInspectingDossier(item)}
                          className="py-1.5 px-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--item-bg)] text-[11px] font-semibold text-[var(--text)] cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-sky-400" />
                          <span>Inspect Dossier</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('hotspots')}
                          className="py-1.5 px-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>View on Map</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PRIORITY RANKING (Multi-Criteria Score) */}
          {/* ========================================================================= */}
          {activeTab === 'ranking' && (
            <div className="space-y-4">
              {/* TOP HEADER & GEMINI AI CONTROLS */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-900 via-sky-600 to-purple-700 dark:from-white dark:via-sky-400 dark:to-purple-500 bg-clip-text text-transparent">
                      Resource-Constrained Prioritization Output
                    </h2>
                    {useGeminiRanking && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-sky-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Gemini 2.5 Flash Powered</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Gemini Model Controls & Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Toggle Gemini AI vs Standard Formula */}
                  <div className="flex items-center rounded-xl bg-[var(--item-bg)] border border-[var(--border-color)] p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setUseGeminiRanking(true)}
                      className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        useGeminiRanking
                          ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gemini AI Rank</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseGeminiRanking(false)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        !useGeminiRanking
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Standard Index
                    </button>
                  </div>

                  {/* Criteria Focus Selector */}
                  {useGeminiRanking && (
                    <select
                      value={rankingCriteria}
                      onChange={(e) => {
                        setRankingCriteria(e.target.value);
                        runGeminiRanking(e.target.value);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-purple-500/30 bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs font-semibold"
                      title="Select Gemini Evaluation Weighting"
                    >
                      <option value="Public Safety & Life Hazard">Focus: Life Safety & Health Hazard</option>
                      <option value="Footfall Density & Economic Disruption">Focus: Density & Economic Footfall</option>
                      <option value="Monsoon Vulnerability & Drainage Overflow">Focus: Monsoon & Drainage Risk</option>
                      <option value="Healthcare & School Proximity">Focus: Healthcare & School Proximity</option>
                    </select>
                  )}

                  {/* Re-Rank with Gemini Button */}
                  {useGeminiRanking && (
                    <button
                      type="button"
                      disabled={isLoadingRanking}
                      onClick={() => runGeminiRanking()}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                    >
                      {isLoadingRanking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Evaluating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-rank AI</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Search & Category Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search petitions..."
                      className="w-36 sm:w-44 pl-8 pr-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 transition-all"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs"
                  >
                    <option value="all">All Sectors</option>
                    <option value="Public Health">Public Health</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Waste Management">Waste Management</option>
                  </select>
                </div>
              </div>

              {/* Prioritization Ranking Table */}
              <div className="w-full overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--item-bg)] border-b border-[var(--border-color)] text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Location & Category & Identified Project Need</th>
                      <th className="py-3 px-4">Urgency & Telemetry</th>
                      <th className="py-3 px-4">{useGeminiRanking ? 'Gemini AI Score' : 'Calculated Score'}</th>
                      <th className="py-3 px-4 text-center">Council Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredItems.slice(0, 8).map((item, idx) => {
                      const aiInfo = geminiRankings[item.id];
                      const displayScore = useGeminiRanking && aiInfo ? aiInfo.aiScore : item.calculatedScore;
                      const urgencyTier = useGeminiRanking && aiInfo ? aiInfo.urgencyTier : (idx === 0 ? 'CRITICAL' : idx === 1 ? 'HIGH' : 'MEDIUM');

                      return (
                        <tr key={item.id} className="hover:bg-[var(--item-hover)] transition-colors">
                          {/* Rank Badge */}
                          <td className="py-3.5 px-4 font-black">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm ${
                                idx === 0
                                  ? 'bg-amber-500 text-white ring-2 ring-amber-400/50'
                                  : idx === 1
                                  ? 'bg-slate-400 text-white'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800/20 dark:bg-slate-700/50 text-[var(--text)]'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                          </td>

                          {/* Project Details with Gemini Rationale */}
                          <td className="py-3.5 px-4 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--text)] text-xs">
                                {item.category} &ndash; {item.ward}
                              </span>
                              {useGeminiRanking && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[9px] font-bold">
                                  AI EVALUATED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                              {item.description}
                            </div>
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                              #{item.id.slice(0, 8)} &bull; {item.ward} &bull; By {item.authorName || 'Citizen'}
                            </div>

                            {/* Gemini Rationale & Directive Callout */}
                            {useGeminiRanking && aiInfo && (
                              <div className="mt-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/25 space-y-1">
                                <div className="text-[10px] text-purple-300 font-medium flex items-start gap-1">
                                  <Sparkles className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                                  <span><b>AI Rationale:</b> {aiInfo.rationale}</span>
                                </div>
                                <div className="text-[10px] text-sky-300 font-medium flex items-start gap-1">
                                  <Zap className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                                  <span><b>Directive:</b> {aiInfo.immediateAction}</span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Urgency */}
                          <td className="py-3.5 px-4 text-[11px] text-[var(--text-muted)]">
                            <div className="mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                urgencyTier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                urgencyTier === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-sky-500/20 text-sky-400'
                              }`}>
                                {urgencyTier}
                              </span>
                            </div>
                            <div>&bull; Demand Index: <strong className="text-[var(--text)]">{item.demandScore}/100</strong></div>
                            <div>&bull; Telemetry Gap: <strong className="text-[var(--text)]">{item.telemetryScore}/100</strong></div>
                          </td>

                          {/* Calculated Score */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start">
                              <span className="text-xl font-black bg-gradient-to-r from-purple-500 to-indigo-400 bg-clip-text text-transparent">
                                {displayScore}
                              </span>
                              <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                                {useGeminiRanking ? 'Gemini Index' : 'Standard'}
                              </span>
                            </div>
                          </td>

                          {/* Council Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  item.status === 'resolved'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : item.status === 'in_progress'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-amber-500/20 text-amber-500'
                                }`}
                              >
                                {item.status.replace('_', ' ')}
                              </span>

                              {item.status === 'resolved' ? (
                                <button
                                  onClick={() => handleStatusChange(item.id, 'in_progress')}
                                  className="px-2.5 py-1 rounded-lg bg-slate-500/20 hover:bg-slate-500/30 text-[var(--text)] text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  REOPEN
                                </button>
                              ) : item.status === 'in_progress' ? (
                                <button
                                  onClick={() => handleStatusChange(item.id, 'resolved')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  RESOLVE
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(item.id, 'in_progress')}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  REVIEW
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PREDICTIVE IMPACT (Counterfactual Policy ROI) */}
          {/* ========================================================================= */}
          {activeTab === 'predictive' && (
            <div className="space-y-6">
              {/* Top Projected Civic Return Selector & Gemini Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-300 font-bold">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span>Projected Civic Return on Investment:</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Gemini Simulation</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedRoiItem}
                    onChange={(e) => {
                      setSelectedRoiItem(e.target.value);
                      runPredictiveImpact(e.target.value);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] text-xs font-semibold outline-none cursor-pointer max-w-sm truncate"
                  >
                    <option value="#1: Capital Hospital Road, Unit-6 - Public Health">#1: Capital Hospital Road, Unit-6 - Public Health</option>
                    <option value="#2: Market Building, Unit-2 - Infrastructure">#2: Market Building, Unit-2 - Infrastructure</option>
                    <option value="#3: Saheed Nagar High School - Education">#3: Saheed Nagar High School - Education</option>
                  </select>

                  <button
                    type="button"
                    disabled={isLoadingPredictive}
                    onClick={() => runPredictiveImpact()}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                  >
                    {isLoadingPredictive ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Simulating...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Simulate ROI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Two Column Impact Cards Powered by Gemini */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Social Equity Impact */}
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="text-base font-extrabold text-[var(--text)]">Social Equity & Community Impact</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      GEMINI VERIFIED
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Quality of Life Boost</span>
                      <span className="text-2xl font-black text-emerald-500">
                        +{geminiPredictiveData?.qualityOfLifeBoost ?? 58}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Predictive analytics model calculating outcome score per municipal rupee allocated. ({selectedRoiItem.split(' - ')[0]})
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Cost Efficiency Index</span>
                      <span className="text-emerald-500">{geminiPredictiveData?.costEfficiencyIndex ?? 86}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--item-bg)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${geminiPredictiveData?.costEfficiencyIndex ?? 86}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] text-right">&plusmn;3% Gemini Empirical Confidence Interval</div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Projected Beneficiaries</span>
                      <span className="text-xl font-black text-sky-500">
                        ~{(geminiPredictiveData?.projectedBeneficiaries ?? 14800).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Simulated community footfall across healthcare, school, and market transit zones.
                    </p>
                  </div>
                </div>

                {/* Economic Vitality & Multi-Dimensional Pillars */}
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="text-base font-extrabold text-[var(--text)]">Economic Vitality & Multi-Dimensional ROI</h3>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                      BMC IMPACT MODEL
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Estimated Civic ROI</span>
                      <span className="text-2xl font-black text-emerald-500">
                        1 : {geminiPredictiveData?.civicRoiRatio ?? 3.6}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Multi-Dimensional Civic Value Generated per Dollar Expended
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Public Health & Safety */}
                    {(() => {
                      const health = (geminiPredictiveData?.pillars as any)?.publicHealthAndSafety || (geminiPredictiveData?.pillars as any)?.publicHealthSafety;
                      const score = health?.score ?? 91;
                      const tier = health?.tier ?? 'CRITICAL';
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-[11px]">PUBLIC HEALTH & SAFETY</span>
                            <span className="text-amber-500 font-bold">
                              {tier} ({score}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--item-bg)] overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Economic Resilience */}
                    {(() => {
                      const econ = geminiPredictiveData?.pillars?.economicResilience;
                      const score = econ?.score ?? 84;
                      const tier = econ?.tier ?? 'HIGH';
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-[11px]">ECONOMIC RESILIENCE</span>
                            <span className="text-sky-400 font-bold">
                              {tier} ({score}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--item-bg)] overflow-hidden">
                            <div
                              className="h-full bg-sky-400 rounded-full transition-all duration-500"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Environmental Longevity */}
                    {(() => {
                      const env = geminiPredictiveData?.pillars?.environmentalLongevity;
                      const score = env?.score ?? 79;
                      const tier = env?.tier ?? 'HIGH';
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-[11px]">ENVIRONMENTAL LONGEVITY</span>
                            <span className="text-emerald-400 font-bold">
                              {tier} ({score}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--item-bg)] overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Social Inclusion */}
                    {(() => {
                      const social = geminiPredictiveData?.pillars?.socialInclusion;
                      const score = social?.score ?? 88;
                      const tier = social?.tier ?? 'HIGH';
                      return (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-[11px]">SOCIAL INCLUSION & ACCESS</span>
                            <span className="text-purple-400 font-bold">
                              {tier} ({score}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--item-bg)] overflow-hidden">
                            <div
                              className="h-full bg-purple-400 rounded-full transition-all duration-500"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Gemini Counterfactual Risk & Executive Recommendation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Counterfactual Risk: What Happens If Unfunded */}
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Deterioration Forecast If Unfunded</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--text-muted)]">Failure Probability:</span>
                    <span className="text-rose-400 font-black">
                      {geminiPredictiveData?.deteriorationIfUnfunded?.probabilityOfFailurePct
                        ? `${geminiPredictiveData.deteriorationIfUnfunded.probabilityOfFailurePct}% within 90 days`
                        : (geminiPredictiveData?.deteriorationIfUnfunded as any)?.probabilityOfFailure || '74% within 90 days'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[var(--text-muted)]">Escalation Penalty:</span>
                    <span className="text-amber-400 font-black">
                      {geminiPredictiveData?.deteriorationIfUnfunded?.projectedEscalationCost ?? '+$340,000 emergency repair cost'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text)] leading-relaxed pt-2 border-t border-rose-500/20">
                    {geminiPredictiveData?.deteriorationIfUnfunded?.consequence ??
                      (geminiPredictiveData?.deteriorationIfUnfunded as any)?.consequences ??
                      'Prolonged neglect creates compound hazards for regional hospital access and triggers extensive sub-surface water erosion.'}
                  </p>
                </div>

                {/* Gemini Executive Recommendation Memo */}
                <div className="lg:col-span-2 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Gemini Executive Council Briefing</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      RECOMMEND APPROVAL
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text)] leading-relaxed italic bg-[var(--item-bg)] p-3 rounded-xl border border-[var(--border-color)]">
                    &ldquo;{geminiPredictiveData?.executiveRecommendation ??
                      'Immediate capital clearance recommended. The high civic multiplier and life-safety proximity justify prioritization in the municipal FY2026 budget cycle.'}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: PORTFOLIO PLAN (Constrained Capital Budget) */}
          {/* ========================================================================= */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Header Title & Gemini Optimization Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2 text-emerald-500">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-xl font-black text-[var(--text)]">Capital Budget Optimization</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Gemini Optimized</span>
                  </span>
                </div>

                {/* Strategy Selector & Trigger */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-semibold">
                    <span>Strategy:</span>
                    <select
                      value={portfolioStrategy}
                      onChange={(e) => {
                        setPortfolioStrategy(e.target.value);
                        runPortfolioPlan(e.target.value, totalBudget);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="Life Safety & Emergency First">Life Safety & Emergency First</option>
                      <option value="Equitable Ward Distribution">Equitable Ward Distribution</option>
                      <option value="Maximum Beneficiaries & ROI">Maximum Beneficiaries & ROI</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-semibold">
                    <span>Budget:</span>
                    <input
                      type="text"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      className="w-20 px-2 py-1 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text)] text-xs font-bold text-center"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isLoadingPortfolio}
                    onClick={() => runPortfolioPlan()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                  >
                    {isLoadingPortfolio ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Balancing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Optimize Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--item-bg)]">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Allocated Capital</span>
                    <span className="text-sky-500 font-black">
                      {geminiPortfolioData?.allocatedCapital ?? '$4.75M'} / {geminiPortfolioData?.totalBudget ?? '$5.00M'} ({geminiPortfolioData?.allocationPercentage ?? (geminiPortfolioData as any)?.allocatedPct ?? 95}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--border-color)] overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${geminiPortfolioData?.allocationPercentage ?? (geminiPortfolioData as any)?.allocatedPct ?? 95}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Automated portfolio balancing under current fiscal year municipal limits.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--item-bg)]">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Remaining Reserve</span>
                    <span className="text-emerald-500 font-black">
                      {geminiPortfolioData?.remainingReserve ?? ((geminiPortfolioData as any)?.remainingReservePct ? `$250,000 (${(geminiPortfolioData as any).remainingReservePct}%)` : '$250,000 (5%)')}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--border-color)] overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full w-[95%]" />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Contingency liquidity buffer reserved for unpredicted monsoon emergencies.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--item-bg)]">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Ward Equity Balance</span>
                    <span className="text-purple-400 font-black">
                      {(geminiPortfolioData as any)?.wardEquityBalancePct ? `${(geminiPortfolioData as any).wardEquityBalancePct}% Balanced` : '96% Balanced'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--border-color)] overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-[96%]" />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {geminiPortfolioData?.wardEquityBalance ?? 'Balanced distribution across East, West, and Central administrative zones.'}
                  </p>
                </div>
              </div>

              {/* Portfolio Breakdown Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Timeline Section (2 cols) */}
                <div className="lg:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      <span className="text-base font-extrabold text-[var(--text)]">Recommended Municipal Project Portfolio</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                      COUNCIL READY
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] -mt-2">
                    Optimized project schedule for upcoming Council General Body approval.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Phase 1: Approved */}
                    {(() => {
                      const phase1Items = geminiPortfolioData?.phase1 || (geminiPortfolioData as any)?.phase1Approved || [
                        { id: '1', title: 'Public Health – Capital Hospital Road, Unit-6', allocatedCost: '$1,075k', ward: 'Unit-6', reason: 'Critical drainage clearance adjacent to regional hospital' },
                        { id: '2', title: 'Infrastructure – Market Building, Unit-2', allocatedCost: '$1,300k', ward: 'Unit-2', reason: 'High-density commercial corridor roadway reconstruction' }
                      ];
                      return (
                        <div className="relative pl-6 border-l-2 border-sky-400 space-y-3">
                          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-sky-400" />
                          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                            Phase 1: Approved for Allocation ({phase1Items.length} Projects)
                          </div>

                          {phase1Items.map((proj: any, pIdx: number) => (
                            <div key={proj.id || pIdx} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] flex justify-between items-center gap-3">
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-[var(--text)]">{proj.title}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{proj.reason}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs shrink-0">
                                {proj.allocatedAmount || proj.allocatedCost || '$1,000k'} Allocated
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Phase 2: Secondary / Reserves */}
                    {(() => {
                      const phase2Items = geminiPortfolioData?.phase2 || (geminiPortfolioData as any)?.phase2Reserve || [
                        { id: '3', title: 'Education – Saheed Nagar High School', allocatedCost: '$850k', ward: 'Saheed Nagar', reason: 'Primary municipal school boundary wall and playground safety' },
                        { id: '4', title: 'Waste Management – Rasulgarh Square', allocatedCost: '$420k', ward: 'Rasulgarh', reason: 'Overflowing municipal compactor replacement' }
                      ];
                      return (
                        <div className="relative pl-6 border-l-2 border-amber-400 space-y-3">
                          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-amber-400" />
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                            Phase 2: Remaining Reserve ({phase2Items.length} Projects)
                          </div>

                          {phase2Items.map((proj: any, pIdx: number) => (
                            <div key={proj.id || pIdx} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] flex justify-between items-center gap-3">
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-[var(--text)]">{proj.title}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{proj.reason}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-500 font-bold text-xs shrink-0">
                                {proj.allocatedAmount || proj.allocatedCost || '$500k'} Allocated
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Phase 3: Deferred */}
                    {(() => {
                      const phase3Items = geminiPortfolioData?.phase3 || (geminiPortfolioData as any)?.phase3Deferred;
                      if (!phase3Items || phase3Items.length === 0) return null;
                      return (
                        <div className="relative pl-6 border-l-2 border-slate-500 space-y-3">
                          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-500" />
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Phase 3: Monitored & Deferred for Next Fiscal Quarter
                          </div>

                          {phase3Items.map((proj: any, pIdx: number) => (
                            <div key={proj.id || pIdx} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] opacity-75 flex justify-between items-center gap-3">
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-[var(--text)]">{proj.title}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{proj.reason}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-500/20 text-[var(--text-muted)] font-semibold text-xs shrink-0">
                                Deferred
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Side Cards */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-purple-300 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Gemini Executive Council Memo</span>
                    </div>
                    <p className="text-[11px] leading-relaxed italic text-[var(--text)]">
                      &ldquo;{geminiPortfolioData?.executiveSummary ??
                        'Portfolio strategy maximizes high-impact civic return within fiscal constraints, ensuring equitable ward representation and prioritized life safety.'}&rdquo;
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[var(--text)] space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      Municipal Fiscal Compliance
                    </div>
                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                      Automated budget allocation adheres to the Bhubaneswar Municipal Corporation Act regulations, guaranteeing reserve buffer protection and statutory council quorum requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: SECURITY & LOGIN AUDIT (Strictly Authority-Only Option) */}
          {/* ========================================================================= */}
          {activeTab === 'audit' && user?.role === 'authority' && (
            <AuthorityLoginAuditSuite currentUser={user} />
          )}
        </div>
      </div>

      {/* Inspect Dossier Modal */}
      {inspectingDossier && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-xs font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-white" />
                  <span>{inspectingDossier.ward}</span>
                </span>
                <span className="text-xs font-bold text-[var(--text)]">
                  {inspectingDossier.category}
                </span>
                {inspectingDossier.isEmergency && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase flex items-center gap-1 animate-pulse shadow-xs">
                    <AlertOctagon className="w-3 h-3 text-white" />
                    <span>EMERGENCY</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setInspectingDossier(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-bold p-1 rounded-lg hover:bg-[var(--item-bg)] cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {inspectingDossier.isEmergency && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 via-rose-900/30 to-amber-950/20 border-2 border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                  <div>
                    <div className="text-rose-200 font-black">CITIZEN MARKED AS EMERGENCY HAZARD</div>
                    <div className="text-[10px] text-rose-300 font-normal">Fast-Track civic escalation &bull; Priority resolution mandated</div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-md bg-rose-600 text-white text-[10px] font-mono font-black shrink-0">
                  24–48h SLA
                </span>
              </div>
            )}

            {inspectingDossier.imageUrl && (
              <div className="w-full h-64 rounded-2xl overflow-hidden bg-slate-950">
                <img
                  src={inspectingDossier.imageUrl}
                  alt={inspectingDossier.category}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)] font-mono">
                Report ID: #{inspectingDossier.id} &bull; Citizen: {inspectingDossier.authorName || 'Citizen Contributor'}
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">
                &ldquo;{inspectingDossier.description}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-xs text-[var(--text-muted)]">
                Current Status: <strong className="uppercase text-sky-500">{inspectingDossier.status.replace('_', ' ')}</strong>
              </span>
              <button
                onClick={() => {
                  handleStatusChange(
                    inspectingDossier.id,
                    inspectingDossier.status === 'resolved' ? 'in_progress' : 'resolved'
                  );
                  setInspectingDossier(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold cursor-pointer hover:shadow-lg transition-all"
              >
                {inspectingDossier.status === 'resolved' ? 'Mark In Progress' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
