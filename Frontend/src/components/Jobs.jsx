import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Edit, Trash2, Play, Pause } from 'lucide-react';
import './Jobs.css';

const JobsManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [sources, setSources] = useState([]); // For source dropdown
  const [editingJob, setEditingJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    job_name: '',
    source_id: '',
    source_table: '',
    target_table: '',
    job_query: ''
  });

  // Base API URL
  const API_BASE_URL = 'http://localhost:8000';
  
  // Debug API calls
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

  // Fetch jobs from backend
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching jobs from:', `${API_BASE_URL}/api/jobs/`);
      
      const response = await apiCall(`${API_BASE_URL}/api/jobs/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched jobs:', data);
      
      // Check if data is an array or handle different response structures
      if (!Array.isArray(data)) {
        if (data && data.results && Array.isArray(data.results)) {
          setJobs(data.results);
        } else if (data && data.data && Array.isArray(data.data)) {
          setJobs(data.data);
        } else {
          throw new Error(`Expected array but got ${typeof data}`);
        }
      } else {
        setJobs(data);
      }
      
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(`Failed to fetch jobs: ${err.message}`);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch source connections for dropdown
  const fetchSources = async () => {
    try {
      console.log('Fetching sources from:', `${API_BASE_URL}/api/source-connections/`);
      const response = await apiCall(`${API_BASE_URL}/api/source-connections/`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched sources:', data);
        
        // Handle different response structures
        if (Array.isArray(data)) {
          setSources(data);
        } else if (data && data.results && Array.isArray(data.results)) {
          setSources(data.results);
        } else if (data && data.data && Array.isArray(data.data)) {
          setSources(data.data);
        }
        
        console.log('Sources set:', data);
      }
    } catch (err) {
      console.error('Error fetching sources:', err);
      // Don't show error for sources as it's secondary
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchJobs();
    fetchSources();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (editingJob) {
        // Update existing job
        const updateData = { ...formData };
        
        console.log('Updating job:', updateData);
        
        const response = await apiCall(`${API_BASE_URL}/api/jobs/${editingJob.id}/`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update error response:', errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Parsed error:', errorJson);
            
            let errorMessage = 'Validation Error:';
            
            if (errorJson.non_field_errors) {
              errorMessage += '\n• ' + errorJson.non_field_errors.join('\n• ');
            }
            
            Object.keys(errorJson).forEach(field => {
              if (field !== 'non_field_errors' && Array.isArray(errorJson[field])) {
                errorMessage += `\n• ${field}: ${errorJson[field].join(', ')}`;
              }
            });
            
            throw new Error(errorMessage);
          } catch (parseError) {
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
          }
        }
        
        setEditingJob(null);
      } else {
        // Add new job
        const cleanFormData = {
          job_name: formData.job_name.trim(),
          source: parseInt(formData.source_id),
          source_table: formData.source_table.trim(),
          target_table: formData.target_table.trim(),
          job_query: formData.job_query.trim()
        };
        
        console.log('Creating job with cleaned data:', cleanFormData);
        
        const response = await apiCall(`${API_BASE_URL}/api/jobs/`, {
          method: 'POST',
          body: JSON.stringify(cleanFormData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Create error response:', errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Parsed error:', errorJson);
            
            let errorMessage = 'Validation Error:';
            
            if (errorJson.non_field_errors) {
              errorMessage += '\n• ' + errorJson.non_field_errors.join('\n• ');
            }
            
            Object.keys(errorJson).forEach(field => {
              if (field !== 'non_field_errors' && Array.isArray(errorJson[field])) {
                errorMessage += `\n• ${field}: ${errorJson[field].join(', ')}`;
              }
            });
            
            throw new Error(errorMessage);
          } catch (parseError) {
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
          }
        }
        
        const responseData = await response.json();
        console.log('Successfully created job:', responseData);
      }
      
      // Refresh the jobs list
      await fetchJobs();
      
      // Reset form
      setFormData({
        id: '',
        job_name: '',
        source_id: '',
        source_table: '',
        target_table: '',
        job_query: ''
      });
      setShowForm(false);
      
    } catch (err) {
      console.error('Error saving job:', err);
      setError(`Failed to save job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      ...job,
      source_id: job.source_id || job.source?.id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Deleting job:', id);
        
        const response = await apiCall(`${API_BASE_URL}/api/jobs/${id}/`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Delete error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        // Refresh the jobs list
        await fetchJobs();
        
      } catch (err) {
        console.error('Error deleting job:', err);
        setError(`Failed to delete job: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingJob(null);
    setFormData({
      id: '',
      job_name: '',
      source_id: '',
      source_table: '',
      target_table: '',
      job_query: ''
    });
  };

  // Get source name by ID
  const getSourceName = (sourceId) => {
    const source = sources.find(s => s.id === sourceId);
    return source ? source.source_name : `Source #${sourceId}`;
  };

  return (
    <div className="jobs-manager">
      <div className="main-container">
        
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <Briefcase className="header-icon" />
            <h1 className="header-title">Data Jobs</h1>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="add-button"
            disabled={loading}
          >
            <Plus className="add-button-icon" />
            <span>Add Job</span>
          </button>
        </div>

        {/* Jobs Table */}
        <div className="table-container">
          <div className="table-header">
            <h2 className="table-title">All Data Jobs</h2>
            {error && (
              <div className="error-message">
                {error}
                <button 
                  onClick={() => {
                    setError(null);
                    fetchJobs();
                  }}
                  className="retry-button"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
          
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="empty-state">
                <Briefcase className="empty-state-icon" />
                <h3>No jobs found</h3>
                <p>Click "Add Job" to create your first data transformation job.</p>
              </div>
            ) : (
              <table className="jobs-table">
                <thead className="table-head">
                  <tr>
                    <th>ID</th>
                    <th>Job Name</th>
                    <th>Source</th>
                    <th>Source Table</th>
                    <th>Target Table</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {jobs.map((job) => (
                    <tr key={job.id} className="table-row">
                      <td className="table-cell table-cell-id">{job.id}</td>
                      <td className="table-cell">{job.job_name}</td>
                      <td className="table-cell">
                        <span className="status-badge status-badge-blue">
                          {getSourceName(job.source_id)}
                        </span>
                      </td>
                      <td className="table-cell">{job.source_table}</td>
                      <td className="table-cell">{job.target_table}</td>
                      <td className="table-cell">
                        <span className="status-badge status-badge-green">
                          {job.status || 'Ready'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="table-cell">
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(job)}
                            className="action-button action-button-edit"
                            title="Edit"
                            disabled={loading}
                          >
                            <Edit className="action-icon" />
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="action-button action-button-delete"
                            title="Delete"
                            disabled={loading}
                          >
                            <Trash2 className="action-icon" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Add/Edit Job Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3 className="modal-title">
                  {editingJob ? 'Edit Job' : 'Add New Job'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="form-container">
                <div className="form-grid">
                  
                  {/* Job Name */}
                  <div className="form-group">
                    <label className="form-label">
                      Job Name *
                    </label>
                    <input
                      type="text"
                      name="job_name"
                      value={formData.job_name}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="e.g., Daily Sales ETL"
                    />
                  </div>

                  {/* Source ID */}
                  <div className="form-group">
                    <label className="form-label">
                      Source Connection *
                    </label>
                    <select
                      name="source_id"
                      value={formData.source_id}
                      onChange={handleInputChange}
                      required
                      className="form-select"
                    >
                      <option value="">Select Source Connection</option>
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.source_name} ({source.host}:{source.port})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Source Table */}
                  <div className="form-group">
                    <label className="form-label">
                      Source Table *
                    </label>
                    <input
                      type="text"
                      name="source_table"
                      value={formData.source_table}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="e.g., sales_transactions"
                    />
                  </div>

                  {/* Target Table */}
                  <div className="form-group">
                    <label className="form-label">
                      Target Table *
                    </label>
                    <input
                      type="text"
                      name="target_table"
                      value={formData.target_table}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="e.g., dim_sales"
                    />
                  </div>
                </div>

                {/* Job Query - Full width */}
                <div className="form-group">
                  <label className="form-label">
                    Job Query (SQL) *
                  </label>
                  <textarea
                    name="job_query"
                    value={formData.job_query}
                    onChange={handleInputChange}
                    required
                    className="form-textarea"
                    placeholder="SELECT * FROM sales_transactions WHERE date >= '2025-01-01'"
                    rows="6"
                  />
                </div>

                {/* Form Buttons */}
                <div className="form-buttons">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="cancel-button"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                  >
                    {editingJob ? 'Update Job' : 'Create Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsManager;