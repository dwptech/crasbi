import React, { useState, useEffect } from 'react';
import { Plus, Database, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import './SourceConnector.css';

const SourceConnectionManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [connections, setConnections] = useState([]);
  const [editingConnection, setEditingConnection] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    source_name: '',
    db_type: '',
    host: '',
    port: '',
    username: '',
    password: '',
    is_active: true,
    inserted_by: 'admin'
  });

  // Sample initial data
  useEffect(() => {
    const sampleConnections = [
      {
        id: 1,
        source_name: 'SAP S/4HANA Production',
        db_type: 'SQL Server',
        host: '192.168.1.100',
        port: 1433,
        username: 'sap_user',
        password: '••••••••',
        is_active: true,
        created_at: '2025-01-15 10:30:00',
        updated_at: '2025-01-15 10:30:00',
        inserted_by: 'admin'
      },
      {
        id: 2,
        source_name: 'SAP Business One',
        db_type: 'MySQL',
        host: '192.168.1.101',
        port: 3306,
        username: 'b1_user',
        password: '••••••••',
        is_active: true,
        created_at: '2025-01-15 11:00:00',
        updated_at: '2025-01-15 11:00:00',
        inserted_by: 'admin'
      }
    ];
    setConnections(sampleConnections);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingConnection) {
      const updatedConnections = connections.map(conn => 
        conn.id === editingConnection.id 
          ? { ...formData, id: editingConnection.id, updated_at: new Date().toLocaleString() }
          : conn
      );
      setConnections(updatedConnections);
      setEditingConnection(null);
    } else {
      const newConnection = {
        ...formData,
        id: Math.max(...connections.map(c => c.id), 0) + 1,
        password: '••••••••',
        created_at: new Date().toLocaleString(),
        updated_at: new Date().toLocaleString()
      };
      setConnections([...connections, newConnection]);
    }

    setFormData({
      id: '',
      source_name: '',
      db_type: '',
      host: '',
      port: '',
      username: '',
      password: '',
      is_active: true,
      inserted_by: 'admin'
    });
    setShowForm(false);
  };

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    setFormData({
      ...connection,
      password: ''
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      setConnections(connections.filter(conn => conn.id !== id));
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
      is_active: true,
      inserted_by: 'admin'
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
          </div>
          
          <div className="table-wrapper">
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
                        >
                          <Edit className="action-icon" />
                        </button>
                        <button
                          onClick={() => handleDelete(connection.id)}
                          className="action-button action-button-delete"
                          title="Delete"
                        >
                          <Trash2 className="action-icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

                  {/* Inserted By */}
                  <div className="form-group">
                    <label className="form-label">
                      Inserted By
                    </label>
                    <input
                      type="text"
                      name="inserted_by"
                      value={formData.inserted_by}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="User who created this connection"
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