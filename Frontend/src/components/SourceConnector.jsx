import React, { useState, useEffect } from 'react';
import { Plus, Database, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import './SourceConnector.css';

const SourceConnectionManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [connections, setConnections] = useState([]);
  const [editingConnection, setEditingConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    source_name: '',
    db_type: '',
    host: '',
    port: '',
    username: '',
    password: '',
    is_active: true
  });

  // Base API URL - adjust this to match your backend
  const API_BASE_URL ='http://localhost:8000';
  
  // Debug API calls
  const apiCall = async (url, options = {}) => {
    console.log('API Call:', url, options);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          // Add any additional headers your backend needs
          // 'Authorization': 'Bearer your-token', // If needed
          ...options.headers,
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  // Fetch connections from backend
  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching from:', `${API_BASE_URL}/api/source-connections/`);
      
      const response = await apiCall(`${API_BASE_URL}/api/source-connections/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error('Backend returned non-array data:', data);
        // Handle different response structures
        if (data && data.results && Array.isArray(data.results)) {
          // Django REST Framework pagination format
          console.log('Using data.results (paginated response)');
          const connectionsWithMaskedPasswords = data.results.map(conn => ({
            ...conn,
            password: '••••••••'
          }));
          setConnections(connectionsWithMaskedPasswords);
        } else if (data && data.data && Array.isArray(data.data)) {
          // Custom API wrapper format
          console.log('Using data.data');
          const connectionsWithMaskedPasswords = data.data.map(conn => ({
            ...conn,
            password: '••••••••'
          }));
          setConnections(connectionsWithMaskedPasswords);
        } else {
          throw new Error(`Expected array but got ${typeof data}. Response structure: ${JSON.stringify(data, null, 2)}`);
        }
      } else {
        // Data is already an array
        const connectionsWithMaskedPasswords = data.map(conn => ({
          ...conn,
          password: '••••••••'
        }));
        setConnections(connectionsWithMaskedPasswords);
      }
      
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError(`Failed to fetch connections: ${err.message}`);
      setConnections([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchConnections();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (editingConnection) {
        // Update existing connection
        const updateData = { ...formData };
        // Remove password if it's empty (keep existing password)
        if (!updateData.password) {
          delete updateData.password;
        }
        
        console.log('Updating connection:', updateData);
        
        const response = await apiCall(`${API_BASE_URL}/api/source-connections/${editingConnection.id}/`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        setEditingConnection(null);
      } else {
        // Add new connection - Clean the data before sending
        const cleanFormData = {
          source_name: formData.source_name.trim(),
          db_type: formData.db_type,
          host: formData.host.trim(),
          port: parseInt(formData.port), // Ensure port is a number
          username: formData.username.trim(),
          password: formData.password,
          is_active: Boolean(formData.is_active) // Ensure boolean
        };
        
        console.log('Creating connection with cleaned data:', cleanFormData);
        console.log('Data types:', {
          source_name: typeof cleanFormData.source_name,
          db_type: typeof cleanFormData.db_type,
          host: typeof cleanFormData.host,
          port: typeof cleanFormData.port,
          username: typeof cleanFormData.username,
          password: typeof cleanFormData.password,
          is_active: typeof cleanFormData.is_active,
          inserted_by: typeof cleanFormData.inserted_by
        });
        
        const response = await apiCall(`${API_BASE_URL}/api/source-connections/`, {
          method: 'POST',
          body: JSON.stringify(cleanFormData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Create error response:', errorText);
          console.error('Request payload was:', cleanFormData);
          
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Parsed error:', errorJson);
            throw new Error(`Validation Error: ${JSON.stringify(errorJson, null, 2)}`);
          } catch {
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
          }
        }
        
        const responseData = await response.json();
        console.log('Successfully created connection:', responseData);
      }
      
      // Refresh the connections list
      await fetchConnections();
      
      // Reset form
      setFormData({
        id: '',
        source_name: '',
        db_type: '',
        host: '',
        port: '',
        username: '',
        password: '',
        is_active: true
      });
      setShowForm(false);
      
    } catch (err) {
      console.error('Error saving connection:', err);
      setError(`Failed to save connection: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    setFormData({
      ...connection,
      password: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Deleting connection:', id);
        
        const response = await apiCall(`${API_BASE_URL}/api/source-connections/${id}/`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Delete error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        // Refresh the connections list
        await fetchConnections();
        
      } catch (err) {
        console.error('Error deleting connection:', err);
        setError(`Failed to delete connection: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingConnection(null);
    setFormData({
      id: '',
      source_name: '',
      db_type: '',
      host: '',
      port: '',
      username: '',
      password: '',
      is_active: true
    });
  };

  return (
    <div className="source-connection-manager">
      <div className="main-container">
        
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <Database className="header-icon" />
            <h1 className="header-title">Source Connections</h1>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="add-button"
          >
            <Plus className="add-button-icon" />
            <span>Add Connection</span>
          </button>
        </div>

        {/* Connections Table */}
        <div className="table-container">
          <div className="table-header">
            <h2 className="table-title">All Source Connections</h2>
            {error && (
              <div className="error-message">
                {error}
                <button 
                  onClick={() => {
                    setError(null);
                    fetchConnections();
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
                <p>Loading connections...</p>
              </div>
            ) : connections.length === 0 ? (
              <div className="empty-state">
                <Database className="empty-state-icon" />
                <h3>No connections found</h3>
                <p>Click "Add Connection" to create your first database connection.</p>
              </div>
            ) : (
              <table className="connections-table">
                <thead className="table-head">
                  <tr>
                    <th>ID</th>
                    <th>Source Name</th>
                    <th>DB Type</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {connections.map((connection) => (
                    <tr key={connection.id} className="table-row">
                      <td className="table-cell table-cell-id">{connection.id}</td>
                      <td className="table-cell">{connection.source_name}</td>
                      <td className="table-cell">
                        <span className="status-badge status-badge-blue">
                          {connection.db_type}
                        </span>
                      </td>
                      <td className="table-cell">{connection.host}</td>
                      <td className="table-cell">{connection.port}</td>
                      <td className="table-cell">{connection.username}</td>
                      <td className="table-cell">
                        <span className={`status-badge ${
                          connection.is_active 
                            ? 'status-badge-green' 
                            : 'status-badge-red'
                        }`}>
                          {connection.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">{connection.inserted_by}</td>
                      <td className="table-cell">
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(connection)}
                            className="action-button action-button-edit"
                            title="Edit"
                            disabled={loading}
                          >
                            <Edit className="action-icon" />
                          </button>
                          <button
                            onClick={() => handleDelete(connection.id)}
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

        {/* Add/Edit Connection Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3 className="modal-title">
                  {editingConnection ? 'Edit Connection' : 'Add New Connection'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="form-container">
                <div className="form-grid">
                  
                  {/* Source Name */}
                  <div className="form-group">
                    <label className="form-label">
                      Source Name *
                    </label>
                    <input
                      type="text"
                      name="source_name"
                      value={formData.source_name}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="e.g., SAP S/4HANA Production"
                    />
                  </div>

                  {/* DB Type */}
                  <div className="form-group">
                    <label className="form-label">
                      Database Type *
                    </label>
                    <select
                      name="db_type"
                      value={formData.db_type}
                      onChange={handleInputChange}
                      required
                      className="form-select"
                    >
                      <option value="">Select Database Type</option>
                      <option value="MySQL">MySQL</option>
                      <option value="PostgreSQL">PostgreSQL</option>
                      <option value="SQL Server">SQL Server</option>
                      <option value="Oracle">Oracle</option>
                      <option value="SAP HANA">SAP HANA</option>
                      <option value="SQLite">SQLite</option>
                    </select>
                  </div>

                  {/* Host */}
                  <div className="form-group">
                    <label className="form-label">
                      Host/IP Address *
                    </label>
                    <input
                      type="text"
                      name="host"
                      value={formData.host}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="e.g., 192.168.1.100"
                    />
                  </div>

                  {/* Port */}
                  <div className="form-group">
                    <label className="form-label">
                      Port *
                    </label>
                    <input
                      type="number"
                      name="port"
                      value={formData.port}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="e.g., 3306"
                    />
                  </div>

                  {/* Username */}
                  <div className="form-group">
                    <label className="form-label">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Database username"
                    />
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingConnection}
                      className="form-input"
                      placeholder={editingConnection ? "Leave empty to keep current password" : "Database password"}
                    />
                  </div>

                  {/* Active Status */}
                  <div className="checkbox-container">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="form-checkbox"
                    />
                    <label className="checkbox-label">
                      Active Connection
                    </label>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="form-buttons">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                  >
                    {editingConnection ? 'Update Connection' : 'Save Connection'}
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

export default SourceConnectionManager;