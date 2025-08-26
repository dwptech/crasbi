import React, { useState, useEffect } from 'react';
import { Play, Database, CheckCircle, Clock, AlertCircle, Activity } from 'lucide-react';
import './etl.css';

const ETLDashboard = () => {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningETL, setRunningETL] = useState(false);
  const [etlStatus, setETLStatus] = useState(null);

  // Base API URL
  const API_BASE_URL = 'http://localhost:8000';

  // API call helper
  const apiCall = async (url, options = {}) => {
    console.log('API Call:', url, options);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      console.log('Response status:', response.status);
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // Fetch source connections
  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching sources from:', `${API_BASE_URL}/api/source-connections/`);
      
      const response = await apiCall(`${API_BASE_URL}/api/source-connections/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched sources:', data);
      
      // Handle different response structures
      if (!Array.isArray(data)) {
        if (data && data.results && Array.isArray(data.results)) {
          setSources(data.results);
        } else if (data && data.data && Array.isArray(data.data)) {
          setSources(data.data);
        } else {
          throw new Error(`Expected array but got ${typeof data}`);
        }
      } else {
        setSources(data);
      }
      
    } catch (err) {
      console.error('Error fetching sources:', err);
      setError(`Failed to fetch sources: ${err.message}`);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  // Load sources on component mount
  useEffect(() => {
    fetchSources();
  }, []);

  // Handle source selection
  const handleSourceChange = (e) => {
    setSelectedSource(e.target.value);
    setETLStatus(null);
  };

  // Handle ETL run
  const handleRunETL = async () => {
    if (!selectedSource) {
      alert('Please select a source connection first');
      return;
    }

    try {
      setRunningETL(true);
      setETLStatus({ status: 'running', message: 'Starting ETL process...' });

      console.log('Running ETL for source:', selectedSource);

      // Simulate ETL process (replace with actual API call)
      const response = await apiCall(`${API_BASE_URL}/api/etl/run_etl/)`,{
        method: 'POST',
        body: JSON.stringify({
          source_id: parseInt(selectedSource)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ETL failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('ETL result:', result);

      setETLStatus({
        status: 'success',
        message: `ETL completed successfully! Processed ${result.records_processed || 'N/A'} records.`
      });

    } catch (err) {
      console.error('ETL error:', err);
      setETLStatus({
        status: 'error',
        message: `ETL failed: ${err.message}`
      });
    } finally {
      setRunningETL(false);
    }
  };

  // Get selected source details
  const getSelectedSourceDetails = () => {
    if (!selectedSource) return null;
    return sources.find(source => source.id === parseInt(selectedSource));
  };

  const selectedSourceDetails = getSelectedSourceDetails();

  return (
    <div className="etl-dashboard">
      <div className="main-container">
        
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <Activity className="header-icon" />
            <h1 className="header-title">ETL Dashboard</h1>
          </div>
          
          <button
            onClick={handleRunETL}
            className="run-etl-button"
            disabled={!selectedSource || runningETL || loading}
          >
            <Play className="run-etl-icon" />
            <span>{runningETL ? 'Running ETL...' : 'Run ETL'}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="dashboard-content">
          
          {/* Source Selection Card */}
          <div className="selection-card">
            <div className="card-header">
              <Database className="card-icon" />
              <h2 className="card-title">Select Source Connection</h2>
            </div>
            
            <div className="card-content">
              {error && (
                <div className="error-message">
                  {error}
                  <button 
                    onClick={() => {
                      setError(null);
                      fetchSources();
                    }}
                    className="retry-button"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading source connections...</p>
                </div>
              ) : sources.length === 0 ? (
                <div className="empty-state">
                  <Database className="empty-state-icon" />
                  <h3>No source connections found</h3>
                  <p>Please create a source connection first before running ETL.</p>
                </div>
              ) : (
                <div className="source-selection">
                  <label className="selection-label">
                    Choose a source connection to run ETL process:
                  </label>
                  
                  <select
                    value={selectedSource}
                    onChange={handleSourceChange}
                    className="source-select"
                    disabled={runningETL}
                  >
                    <option value="">-- Select Source Connection --</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.source_name} ({source.db_type} - {source.host}:{source.port})
                      </option>
                    ))}
                  </select>

                  {/* Selected Source Details */}
                  {selectedSourceDetails && (
                    <div className="source-details">
                      <h4 className="details-title">Connection Details:</h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Name:</span>
                          <span className="detail-value">{selectedSourceDetails.source_name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Type:</span>
                          <span className="detail-value status-badge status-badge-blue">
                            {selectedSourceDetails.db_type}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Host:</span>
                          <span className="detail-value">{selectedSourceDetails.host}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Port:</span>
                          <span className="detail-value">{selectedSourceDetails.port}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Username:</span>
                          <span className="detail-value">{selectedSourceDetails.username}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status:</span>
                          <span className={`detail-value status-badge ${
                            selectedSourceDetails.is_active 
                              ? 'status-badge-green' 
                              : 'status-badge-red'
                          }`}>
                            {selectedSourceDetails.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ETL Status Card */}
          {etlStatus && (
            <div className="status-card">
              <div className="card-header">
                {etlStatus.status === 'running' && <Clock className="card-icon status-icon-running" />}
                {etlStatus.status === 'success' && <CheckCircle className="card-icon status-icon-success" />}
                {etlStatus.status === 'error' && <AlertCircle className="card-icon status-icon-error" />}
                <h2 className="card-title">ETL Status</h2>
              </div>
              
              <div className="card-content">
                <div className={`status-message status-${etlStatus.status}`}>
                  {etlStatus.message}
                </div>
                
                {etlStatus.status === 'running' && (
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ETLDashboard;