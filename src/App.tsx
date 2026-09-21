import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ContentView } from './components/views/ContentView';
import { CalendarView } from './components/views/CalendarView';
import { AccountsView } from './components/views/AccountsView';
import { BrandsView } from './components/views/BrandsView';
import { ImportView } from './components/views/ImportView';
import { PublishingView } from './components/views/PublishingView';
import { SettingsView } from './components/views/SettingsView';
import { CreateContentModal } from './components/CreateContentModal';
import { BrandModal } from './components/BrandModal';
import { AccountModal } from './components/AccountModal';
import { ContentPreviewModal } from './components/ContentPreviewModal';

const AppLayout: React.FC = () => {
  const { selectedContentItem, setSelectedContentItem, setSelectedBrandId } = useApp();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <Navbar onOpenCreateModal={() => setIsCreateOpen(true)} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-row">
        {/* Left Vertical Navigation */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Dynamic Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onOpenCreate={() => setIsCreateOpen(true)}
            />
          )}

          {currentTab === 'content' && (
            <ContentView onOpenCreate={() => setIsCreateOpen(true)} />
          )}

          {currentTab === 'calendar' && <CalendarView />}

          {currentTab === 'accounts' && (
            <AccountsView onOpenAddAccount={() => setIsAccountModalOpen(true)} />
          )}

          {currentTab === 'brands' && (
            <BrandsView
              onOpenAddBrand={() => setIsBrandModalOpen(true)}
              onSelectBrandFilter={(brandId) => {
                setSelectedBrandId(brandId);
                setCurrentTab('content');
              }}
            />
          )}

          {currentTab === 'import' && <ImportView />}

          {currentTab === 'publishing' && <PublishingView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Action Modals */}
      {isCreateOpen && <CreateContentModal onClose={() => setIsCreateOpen(false)} />}

      {isBrandModalOpen && <BrandModal onClose={() => setIsBrandModalOpen(false)} />}

      {isAccountModalOpen && (
        <AccountModal onClose={() => setIsAccountModalOpen(false)} />
      )}

      {selectedContentItem && (
        <ContentPreviewModal
          item={selectedContentItem}
          onClose={() => setSelectedContentItem(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
