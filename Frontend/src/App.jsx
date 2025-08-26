import React, { useState, useEffect } from 'react';
import { Database, Briefcase, Activity } from 'lucide-react';
import SourceConnectionManager from './components/SourceConnector';
import JobsManager from './components/Jobs';
import ETLDashboard from './components/etl';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('connections');

  // Handle URL routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('source-connections')) {
      setActiveTab('connections');
    } else if (path.includes('jobs')) {
      setActiveTab('jobs');
    } else if (path.includes('etl-dashboard')) {
      setActiveTab('etl');
    }
  }, []);

  // Handle tab changes and update URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    
    // Update URL without page reload
    if (tabId === 'connections') {
      window.history.pushState({}, '', '/source-connections');
    } else if (tabId === 'jobs') {
      window.history.pushState({}, '', '/jobs');
    } else if (tabId === 'etl') {
      window.history.pushState({}, '', '/etl-dashboard');
    }
  };

  const tabs = [
    {
      id: 'connections',
      label: 'Source Connections',
      icon: Database,
      component: SourceConnectionManager
    },
    {
      id: 'jobs',
      label: 'Data Jobs',
      icon: Briefcase,
      component: JobsManager
    },
    {
      id: 'etl',
      label: 'ETL Dashboard',
      icon: Activity,
      component: ETLDashboard
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="app">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <Database className="brand-icon" />
            <span className="brand-text">Data Management</span>
          </div>
          
          <div className="nav-tabs">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`nav-tab ${activeTab === tab.id ? 'nav-tab-active' : ''}`}
                >
                  <IconComponent className="tab-icon" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="main-content">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}

export default App;