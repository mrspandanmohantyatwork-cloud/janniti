import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JannitiPortal } from './components/JannitiPortal';
import { TeamSection } from './components/TeamSection';
import { OfficerIntelligenceSuite } from './components/OfficerIntelligenceSuite';
import { AuthModal } from './components/AuthModal';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { ProfileDropdown } from './components/ProfileDropdown';
import { SubmissionsDrawer } from './components/SubmissionsDrawer';
import { NotificationsModal } from './components/NotificationsModal';
import { CivicLogo } from './components/CivicLogo';
import { Language, User, CivicUpdate, NotificationItem, CivicFeedback } from './types';
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  getStoredCivicUpdates,
  saveStoredCivicUpdates,
  getStoredNotifications,
  saveStoredNotifications,
  buildUserFromAccount,
  getStoredAccounts,
  isDisallowedIssue,
  normalizeExactLocation,
} from './utils/authStorage';
import { recordLoginAudit } from './utils/auditStorage';
import {
  sendOrderToSupabase,
  fetchOrdersFromSupabase,
  updateOrderStatusInSupabase,
} from './utils/supabaseClient';
import { Heart, ArrowUpRight } from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<'janniti' | 'team' | 'officer'>('janniti');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<Language>('en');

  // User & Auth State (Starts from local session or null)
  const [user, setUser] = useState<User | null>(() => getActiveSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialView, setAuthInitialView] = useState<'signin' | 'signup'>('signin');
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'resolved'>('all');
  const [submissionsUserOnly, setSubmissionsUserOnly] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Real Data State (starts empty or from real user submissions)
  const [updates, setUpdates] = useState<CivicUpdate[]>(() => getStoredCivicUpdates());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getStoredNotifications());

  // On arrival: if user is not logged in, prompt sign in page & sync orders with Supabase
  useEffect(() => {
    if (!user) {
      setIsAuthModalOpen(true);
      setAuthInitialView('signin');
    } else if (user.role === 'authority') {
      // Direct authority officers into the Officer Intelligence Suite
      setCurrentTab('officer');
    } else if (!user.profileCompleted) {
      setIsProfileSetupOpen(true);
    }

    // Synchronize latest records from Supabase orders database
    fetchOrdersFromSupabase()
      .then((remoteOrders) => {
        setUpdates((prevUpdates) => {
          const cleanPrev = prevUpdates.filter((u) => !isDisallowedIssue(u));
          const remoteMap = new Map(remoteOrders.map((ro) => [ro.id, ro]));
          // Synchronize remote status, images, and petition details onto local updates
          const updatedPrev = cleanPrev.map((u) => {
            const remote = remoteMap.get(u.id);
            if (remote) {
              return {
                ...u,
                status: remote.status,
                imageUrl: remote.imageUrl || u.imageUrl,
                audioUrl: remote.audioUrl || u.audioUrl,
                authorName: remote.authorName || u.authorName,
                description: remote.description || u.description,
                ward: normalizeExactLocation(remote.ward || u.ward),
                category: remote.category || u.category,
              };
            }
            return { ...u, ward: normalizeExactLocation(u.ward) };
          });
          const existingIds = new Set(updatedPrev.map((u) => u.id));
          const freshOrders = remoteOrders
            .filter((ro) => !existingIds.has(ro.id) && !isDisallowedIssue(ro))
            .map((ro) => ({ ...ro, ward: normalizeExactLocation(ro.ward) }));
          const merged = [...freshOrders, ...updatedPrev];
          saveStoredCivicUpdates(merged);
          return merged;
        });
      })
      .catch((err) => {
        console.warn('Supabase fetch notice:', err);
      });
  }, []);

  // Theme synchronization with DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenAuth = (view: 'signin' | 'signup') => {
    setAuthInitialView(view);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (loggedUser: User, needsProfileCompletion: boolean) => {
    setUser(loggedUser);
    setIsAuthModalOpen(false);

    if (loggedUser.role === 'authority') {
      setCurrentTab('officer');
    } else if (needsProfileCompletion || !loggedUser.profileCompleted) {
      // Step: After login citizen will fill the required details
      setIsProfileSetupOpen(true);
    }
  };

  const handleProfileComplete = (updatedUser: User) => {
    setUser(updatedUser);
    saveActiveSession(updatedUser);
    setIsProfileSetupOpen(false);

    // Welcome notification
    const welcomeNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Profile Verified',
      message: `Welcome, ${updatedUser.name}! Your account is verified for ${updatedUser.ward}.`,
      time: 'Just now',
      read: false,
      type: 'announcement',
    };
    const updatedNotifs = [welcomeNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveStoredNotifications(updatedNotifs);
  };

  const handleSignOut = () => {
    if (user) {
      recordLoginAudit({
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        department: user.department,
        ward: user.ward,
        status: 'LOGOUT',
        authMethod: 'User Session Termination',
        details: 'User initiated secure logout from session',
      }).catch(console.error);
    }
    clearActiveSession();
    setUser(null);
    setIsProfileOpen(false);
    setIsAuthModalOpen(true);
    setAuthInitialView('signin');
  };

  const handleAddUpdate = (newUpdate: CivicUpdate) => {
    const nextUpdates = [newUpdate, ...updates];
    setUpdates(nextUpdates);
    saveStoredCivicUpdates(nextUpdates);

    // Send complete order/petition fields to Supabase
    sendOrderToSupabase({
      id: newUpdate.id,
      user,
      ward: newUpdate.ward,
      category: newUpdate.category,
      description: newUpdate.description,
      status: newUpdate.status,
      imageUrl: newUpdate.imageUrl,
      audioUrl: newUpdate.audioUrl,
      amount: 0,
      metadata: {
        category: newUpdate.category,
        authorName: newUpdate.authorName,
      },
    }).catch((err) => {
      console.warn('Supabase sync background note:', err);
    });

    // Update real user counts if logged in
    if (user) {
      const updatedUser: User = {
        ...user,
        submissionsCount: user.submissionsCount + 1,
      };
      setUser(updatedUser);
      saveActiveSession(updatedUser);
    }

    // Add a real notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Civic Request Logged',
      message: `Request #${newUpdate.id} (${newUpdate.category}) in ${newUpdate.ward} has been registered to the Council ledger.`,
      time: 'Just now',
      read: false,
      type: 'status_change',
    };
    const nextNotifs = [newNotif, ...notifications];
    setNotifications(nextNotifs);
    saveStoredNotifications(nextNotifs);
  };

  const handleMarkAllRead = () => {
    const readNotifs = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(readNotifs);
    saveStoredNotifications(readNotifs);
  };

  const handleProvideFeedback = (id: string, feedback: CivicFeedback) => {
    const nextUpdates = updates.map((u) => (u.id === id ? { ...u, feedback } : u));
    setUpdates(nextUpdates);
    saveStoredCivicUpdates(nextUpdates);
  };

  return (
    <div className="min-h-screen flex flex-col pt-20 transition-colors duration-300">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        theme={theme}
        toggleTheme={toggleTheme}
        language={language}
        setLanguage={setLanguage}
        user={user}
        onOpenAuth={handleOpenAuth}
        onToggleProfile={() => setIsProfileOpen((prev) => !prev)}
        onOpenSubmissions={() => {
          setSubmissionsFilter('all');
          setIsSubmissionsOpen(true);
        }}
      />

      {/* Profile Popup Dropdown */}
      {user && (
        <ProfileDropdown
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onEditProfile={() => setIsProfileSetupOpen(true)}
          onOpenIntelligenceSuite={() => setCurrentTab('officer')}
          onOpenSubmissions={() => {
            setSubmissionsFilter('all');
            setSubmissionsUserOnly(true);
            setIsSubmissionsOpen(true);
          }}
          onOpenResolved={() => {
            setSubmissionsFilter('resolved');
            setSubmissionsUserOnly(true);
            setIsSubmissionsOpen(true);
          }}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />
      )}

      {/* Main Content View */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {currentTab === 'janniti' ? (
          <JannitiPortal
            language={language}
            user={user}
            updates={updates}
            onAddUpdate={handleAddUpdate}
            onOpenAuth={handleOpenAuth}
            onProvideFeedback={handleProvideFeedback}
          />
        ) : currentTab === 'officer' ? (
          <OfficerIntelligenceSuite
            user={user}
            updates={updates}
            onNavigateToCitizenView={() => setCurrentTab('janniti')}
            onUpdateStatus={(id, newStatus) => {
              const nextUpdates = updates.map((u) => (u.id === id ? { ...u, status: newStatus } : u));
              setUpdates(nextUpdates);
              saveStoredCivicUpdates(nextUpdates);
              updateOrderStatusInSupabase(id, newStatus).catch((err) => {
                console.warn('Failed to sync status update to Supabase:', err);
              });
            }}
          />
        ) : (
          <TeamSection />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl py-6 px-4 sm:px-8 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <button
            onClick={() => setCurrentTab('team')}
            className="flex items-center gap-3 text-left group cursor-pointer"
            title="About Developers (Civic Innovators)"
          >
            <CivicLogo size="sm" />
            <div>
              <span className="font-bold text-sky-500 dark:text-sky-400 tracking-wider group-hover:text-blue-900 dark:group-hover:text-blue-300 transition-colors">
                CIVIC INNOVATORS
              </span>
              <p className="text-[11px] text-[var(--text-muted)]">
                &ldquo;Engineering intelligent public systems for transparent civic governance&rdquo; &bull; MEET OUR TEAM
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setCurrentTab('janniti')}
              className="hover:text-[var(--primary)] transition-colors cursor-pointer"
            >
              JANNITI Portal
            </button>
            <button
              onClick={() => setCurrentTab('team')}
              className="hover:text-[var(--primary)] transition-colors cursor-pointer"
            >
              About Developers
            </button>
            <button
              onClick={() => {
                setSubmissionsFilter('all');
                setSubmissionsUserOnly(false);
                setIsSubmissionsOpen(true);
              }}
              className="hover:text-[var(--primary)] transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <span>Civic Ledger</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Better Communities</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authInitialView}
        canDismiss={!!user}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Required Details / Profile Setup Modal */}
      {user && (
        <ProfileSetupModal
          isOpen={isProfileSetupOpen}
          user={user}
          onComplete={handleProfileComplete}
        />
      )}

      {/* Submissions Ledger Drawer */}
      <SubmissionsDrawer
        isOpen={isSubmissionsOpen}
        onClose={() => setIsSubmissionsOpen(false)}
        updates={updates}
        user={user}
        initialFilter={submissionsFilter}
        userOnly={submissionsUserOnly}
        onProvideFeedback={handleProvideFeedback}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />
    </div>
  );
}
