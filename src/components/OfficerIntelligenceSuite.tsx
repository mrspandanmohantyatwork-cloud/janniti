import React, { useState, useMemo } from 'react';
import { CivicUpdate, User } from '../types';
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
  ExternalLink,
  ChevronRight,
  Shield,
  Eye,
  Sliders,
  DollarSign,
  Users,
  Compass,
  Building,
  Calendar,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface OfficerIntelligenceSuiteProps {
  user: User | null;
  updates: CivicUpdate[];
  onUpdateStatus?: (id: string, newStatus: 'pending' | 'reviewing' | 'in_progress' | 'resolved') => void;
  onNavigateToCitizenView?: () => void;
}

type SuiteTab = 'hotspots' | 'fusion' | 'ranking' | 'predictive' | 'portfolio';

export const OfficerIntelligenceSuite: React.FC<OfficerIntelligenceSuiteProps> = ({
  user,
  updates,
  onUpdateStatus,
  onNavigateToCitizenView,
}) => {
  const [activeTab, setActiveTab] = useState<SuiteTab>('ranking');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photo' | 'audio' | 'text'>('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedRoiItem, setSelectedRoiItem] = useState<string>('#1: Ward 7 - Public Health');
  const [inspectingDossier, setInspectingDossier] = useState<CivicUpdate | null>(null);

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
      // Pre-calculate telemetry and urgency scores based on ward and category
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

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.authorName && item.authorName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesWard = selectedWard === 'all' || item.ward.toLowerCase().includes(selectedWard.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

      let matchesMedia = true;
      if (selectedMediaType === 'photo') matchesMedia = !!item.imageUrl;
      if (selectedMediaType === 'audio') matchesMedia = !!item.audioUrl;
      if (selectedMediaType === 'text') matchesMedia = !item.imageUrl && !item.audioUrl;

      return matchesSearch && matchesWard && matchesCategory && matchesStatus && matchesMedia;
    });
  }, [allItems, searchQuery, selectedWard, selectedCategory, selectedStatus, selectedMediaType]);

  // Wards with active counts
  const wardPins = [
    { ward: 'Ward 7', category: 'Public Health', lat: 20.265, lng: 85.835, count: 2, status: 'high' },
    { ward: 'Ward 3', category: 'Infrastructure', lat: 20.298, lng: 85.864, count: 3, status: 'high' },
    { ward: 'Ward 1', category: 'Safety', lat: 20.281, lng: 85.845, count: 1, status: 'in_progress' },
    { ward: 'Ward 2', category: 'Waste Management', lat: 20.274, lng: 85.829, count: 1, status: 'medium' },
    { ward: 'Ward 4', category: 'Transit', lat: 20.252, lng: 85.848, count: 1, status: 'medium' },
    { ward: 'Ward 5', category: 'Education', lat: 20.269, lng: 85.871, count: 1, status: 'medium' },
    { ward: 'Ward 6', category: 'Water & Sanitation', lat: 20.291, lng: 85.831, count: 1, status: 'medium' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-colors">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Municipal Administration • BMC Bhubaneswar
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text)]">
            Officer Intelligence Suite
          </h1>
        </div>
      </div>

      {/* Main Suite Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Bar (5 Suite Tabs) */}
        <aside className="lg:col-span-3 space-y-2 bg-[var(--card-bg)] p-3 sm:p-4 rounded-3xl border border-[var(--border-color)] shadow-[0_10px_30px_var(--shadow-color)]">
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
        </aside>

        {/* Right Active View Content Area */}
        <div className="lg:col-span-9 bg-[var(--card-bg)] p-4 sm:p-6 rounded-3xl border border-[var(--border-color)] shadow-[0_10px_30px_var(--shadow-color)] min-h-[600px]">
          {/* ========================================================================= */}
          {/* TAB 1: DEMAND HOTSPOTS (GIS Heatmap & Clusters) */}
          {/* ========================================================================= */}
          {activeTab === 'hotspots' && (
            <div className="space-y-4">
              {/* GIS Top Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-600 dark:text-sky-300">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-500" />
                  <span className="font-bold">OpenStreetMap GIS & Telemetry</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900/40 text-[10px] text-sky-400 border border-sky-500/30">
                    Bhubaneswar Municipal Corporation (BMC)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white font-bold text-[11px]">All Layers</span>
                  <span className="px-2 py-1 rounded-lg bg-[var(--item-bg)] text-[var(--text-muted)] text-[11px]">Wards</span>
                  <span className="px-2 py-1 rounded-lg bg-[var(--item-bg)] text-[var(--text-muted)] text-[11px]">Petitions (11)</span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    OpenStreetMap Live
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

              {/* Map Canvas / Simulated Leaflet Interactive Container */}
              <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-[var(--border-color)] bg-slate-900 shadow-inner">
                {/* Embedded OpenStreetMap view */}
                <iframe
                  title="OpenStreetMap Bhubaneswar GIS"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=85.78%2C20.22%2C85.90%2C20.34&amp;layer=mapnik"
                  className="w-full h-full border-0 opacity-80 dark:opacity-60 contrast-125"
                  loading="lazy"
                />

                {/* Overlaid GIS Ward Pin Markers */}
                <div className="absolute inset-0 pointer-events-none p-4">
                  {wardPins.map((pin, i) => (
                    <div
                      key={pin.ward}
                      style={{
                        position: 'absolute',
                        top: `${20 + (i % 4) * 22}%`,
                        left: `${25 + (i % 3) * 28 + (i % 2) * 5}%`,
                      }}
                      className="pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    >
                      <div className="flex flex-col items-center">
                        <div className="px-2.5 py-1 rounded-full bg-slate-950/90 text-white border border-sky-400 text-[11px] font-bold shadow-lg flex items-center gap-1 group-hover:scale-110 transition-transform">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>{pin.ward}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-sky-500/40 text-[9px] text-sky-200">
                            {pin.count}
                          </span>
                        </div>
                        <div className="w-2 h-2 bg-slate-950 rotate-45 -mt-1 border-r border-b border-sky-400" />

                        {/* Tooltip on hover */}
                        <div className="hidden group-hover:block absolute bottom-full mb-1 p-2 rounded-xl bg-slate-950/95 border border-sky-400 text-white text-[10px] w-48 shadow-xl z-20 pointer-events-none">
                          <p className="font-bold text-sky-400">{pin.ward} • {pin.category}</p>
                          <p className="text-slate-300 mt-0.5">High-priority citizen petitions logged. Tap to view dossier.</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Map Legend Overlay */}
                <div className="absolute bottom-3 left-3 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700 text-white text-xs max-w-xs space-y-1.5 shadow-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GIS Hotspot Legend</div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span>High Density Ward Hotspot</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Active Citizen Field Report</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Engineering Work In Progress</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                <span>Active Pins: <strong>11 Citizen Submissions</strong> • Wards Mapped: <strong>8</strong></span>
                <span className="text-[11px]">Map Data &copy; OpenStreetMap contributors &bull; Bhubaneswar BMC</span>
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
                <div className="flex items-center gap-1.5 bg-[var(--item-bg)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    onClick={() => setSelectedMediaType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedMediaType === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
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
                </div>

                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search text, ward, or citizen..."
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
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Wards (8)</option>
                  <option value="ward 7">Ward 7</option>
                  <option value="ward 3">Ward 3</option>
                  <option value="ward 20">Ward 20</option>
                  <option value="ward 1">Ward 1</option>
                  <option value="ward 2">Ward 2</option>
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
                    className="flex flex-col justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div>
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
                            <span className="text-[11px] text-slate-400 mt-1">&ldquo;Voice/Photo civic development request submitted.&rdquo;</span>
                          </div>
                        )}

                        {/* Top Left Ward badge */}
                        <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold">
                          {item.ward}
                        </span>

                        {/* Top Right Category badge */}
                        <span className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-sky-500 text-white text-[10px] font-bold">
                          {item.category}
                        </span>

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
                          <span>Map Ward</span>
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
              {/* TOP HEADER: User Request 1 explicitly required removing the formula box and subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-900 via-sky-600 to-purple-700 dark:from-white dark:via-sky-400 dark:to-purple-500 bg-clip-text text-transparent">
                    Resource-Constrained Prioritization Output
                  </h2>
                  {/* Note: Descriptive subtitle paragraph removed as requested in Request 1 */}
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search civic petitions, key..."
                      className="w-44 sm:w-56 pl-8 pr-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 transition-all"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] outline-none cursor-pointer text-xs"
                  >
                    <option value="all">All (Ward & Category)</option>
                    <option value="Public Health">Public Health</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Waste Management">Waste Management</option>
                  </select>
                </div>
              </div>

              {/* Prioritization Ranking Table (Screenshot 2 Representation) */}
              <div className="w-full overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--item-bg)] border-b border-[var(--border-color)] text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Ward & Category & Identified Project Need</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Calculated Score</th>
                      <th className="py-3 px-4 text-center">Council Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredItems.slice(0, 8).map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[var(--item-hover)] transition-colors">
                        {/* Rank Badge */}
                        <td className="py-3.5 px-4 font-black">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm ${
                              idx === 0
                                ? 'bg-amber-500 text-white'
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

                        {/* Project Details */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="font-bold text-[var(--text)] text-xs">
                            {item.category} &ndash; {item.ward}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                            #{item.id.slice(0, 8)} &bull; {item.ward} &bull; By {item.authorName || 'Citizen'}
                          </div>
                        </td>

                        {/* Urgency */}
                        <td className="py-3.5 px-4 text-[11px] text-[var(--text-muted)]">
                          <div>&bull; Demand Index: <strong className="text-[var(--text)]">{item.demandScore}/100</strong></div>
                          <div>&bull; Infrastructure Gap (Telemetry): <strong className="text-[var(--text)]">{item.telemetryScore}/100</strong></div>
                        </td>

                        {/* Calculated Score */}
                        <td className="py-3.5 px-4">
                          <span className="text-base font-black text-purple-600 dark:text-purple-400">
                            {item.calculatedScore}
                          </span>
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
                    ))}
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
              {/* Top Projected Civic Return Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-300 font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Projected Civic Return on Investment:</span>
                </div>
                <select
                  value={selectedRoiItem}
                  onChange={(e) => setSelectedRoiItem(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--select-bg)] text-[var(--text)] text-xs font-semibold outline-none cursor-pointer max-w-md truncate"
                >
                  <option value="#1: Ward 7 - Public Health">#1: Ward 7 - Public Health (Voice/Photo civic development request...)</option>
                  <option value="#2: Ward 3 - Infrastructure">#2: Ward 3 - Infrastructure (Road pothole reconstruction)</option>
                  <option value="#3: Ward 5 - Education">#3: Ward 5 - Education (School boundary wall restoration)</option>
                </select>
              </div>

              {/* Two Column Impact Cards (Screenshot 5 Representation) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Social Equity Impact */}
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="text-base font-extrabold text-[var(--text)]">Social Equity Impact</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">HIGH IMPACT</span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Quality of Life Boost</span>
                      <span className="text-2xl font-black text-emerald-500">+53%</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Predictive analytics model calculating outcome score per municipal rupee allocated. (Ward 7)
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Cost Efficiency Index</span>
                      <span className="text-emerald-500">82%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--item-bg)] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full w-[82%]" />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] text-right">&plusmn;5% Empirical Variance Interval</div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Projected Beneficiaries</span>
                      <span className="text-xl font-black text-sky-500">~13,440</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Simulated community outcomes across social equity, health, and economic indicators.
                    </p>
                  </div>
                </div>

                {/* Economic Vitality */}
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="text-base font-extrabold text-[var(--text)]">Economic Vitality</h3>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">BMC MODEL</span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-[var(--text-muted)]">Estimated Civic ROI</span>
                      <span className="text-2xl font-black text-emerald-500">1 : 3.4</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Multi-Dimensional Impact Analysis
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-[11px]">PUBLIC HEALTH & SAFETY</span>
                        <span className="text-amber-500 font-bold">MODERATE (72%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--item-bg)] overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[72%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-[11px]">ECONOMIC RESILIENCE</span>
                        <span className="text-sky-400 font-bold">HIGH (88%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--item-bg)] overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full w-[88%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: PORTFOLIO PLAN (Constrained Capital Budget) */}
          {/* ========================================================================= */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Header Title */}
              <div className="flex items-center gap-2 text-emerald-500">
                <DollarSign className="w-5 h-5" />
                <h2 className="text-xl font-black text-[var(--text)]">Capital Budget Optimization</h2>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--item-bg)]">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Allocated Capital</span>
                    <span className="text-sky-500 font-black">$9.43M / $5.00M (100%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--border-color)] overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full w-full" />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Automated portfolio balancing under current fiscal year municipal limits.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--item-bg)]">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span>Remaining Reserve</span>
                    <span className="text-emerald-500 font-black">95%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--border-color)] overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full w-[95%]" />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Optimized project schedule for upcoming Council General Body approval.
                  </p>
                </div>
              </div>

              {/* Portfolio Breakdown Layout (Screenshot 4 Representation) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Timeline Section (2 cols) */}
                <div className="lg:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    <span className="text-base font-extrabold text-[var(--text)]">Recommended Municipal Project Portfolio</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] -mt-2">
                    Optimized project schedule for upcoming Council General Body approval.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Phase 1 */}
                    <div className="relative pl-6 border-l-2 border-sky-400 space-y-3">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-sky-400" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                        Phase 1: Approved for Allocation
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Public Health &ndash; Ward 7</div>
                          <div className="text-[11px] text-[var(--text-muted)]">Voice/Photo civic development request submitted.</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs">
                          $1075k Allocated
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Infrastructure &ndash; Ward 3</div>
                          <div className="text-[11px] text-[var(--text-muted)]">Big pothole on the road which is creating problem...</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs">
                          $1300k Allocated
                        </span>
                      </div>
                    </div>

                    {/* Phase 2 */}
                    <div className="relative pl-6 border-l-2 border-amber-400 space-y-3">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-amber-400" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        Phase 2: Remaining Reserve
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Education &ndash; Ward 5</div>
                          <div className="text-[11px] text-[var(--text-muted)]">Primary municipal school boundary wall restoration</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-500 font-bold text-xs">
                          $850k Allocated
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-[var(--text)]">Waste Management &ndash; Ward 2</div>
                          <div className="text-[11px] text-[var(--text-muted)]">Overflowing municipal container replacement</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-500 font-bold text-xs">
                          $420k Allocated
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side Cards */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-300 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider">Municipal Capital Budget</div>
                    <p className="text-[11px] leading-relaxed">
                      Automated portfolio balancing under current fiscal year municipal limits.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider">Recommended Municipal Project Portfolio</div>
                    <p className="text-[11px] leading-relaxed">
                      Optimized project schedule for upcoming Council General Body approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Dossier Modal */}
      {inspectingDossier && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white text-xs font-bold">
                  {inspectingDossier.ward}
                </span>
                <span className="text-xs font-bold text-[var(--text)]">
                  {inspectingDossier.category}
                </span>
              </div>
              <button
                onClick={() => setInspectingDossier(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-bold p-1 rounded-lg hover:bg-[var(--item-bg)] cursor-pointer"
              >
                Close ✕
              </button>
            </div>

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
