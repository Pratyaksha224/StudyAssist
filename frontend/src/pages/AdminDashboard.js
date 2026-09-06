import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';
import NoteUpload from '../components/NoteUpload';  // ← IMPORT THE UPLOAD COMPONENT

const AdminDashboard = () => {
    const { user, token } = useAuth();
    const [branches, setBranches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form states for adding branch
    const [newBranch, setNewBranch] = useState({ name: '', code: '' });

    // Form states for adding subject
    const [newSubject, setNewSubject] = useState({
        name: '',
        code: '',
        branch: '',
        semester: '',
    });

    // ============================================================
    // FETCH DATA
    // ============================================================
    const fetchData = useCallback(async () => {
        if (!token) return;

        try {
            setLoading(true);
            const [branchesRes, subjectsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/subjects/branches', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get('http://localhost:5000/api/admin/subjects/subjects', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            setBranches(branchesRes.data);
            setSubjects(subjectsRes.data);
            setError('');
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ============================================================
    // ADD BRANCH
    // ============================================================
    const handleAddBranch = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.post(
                'http://localhost:5000/api/admin/subjects/branches',
                newBranch,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess('Branch added successfully!');
            setNewBranch({ name: '', code: '' });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add branch');
        }
    };

    // ============================================================
    // ADD SUBJECT
    // ============================================================
    const handleAddSubject = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.post(
                'http://localhost:5000/api/admin/subjects/subjects',
                newSubject,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess('Subject added successfully!');
            setNewSubject({
                name: '',
                code: '',
                branch: '',
                semester: '',
            });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add subject');
        }
    };

    // ============================================================
    // DELETE BRANCH
    // ============================================================
    const handleDeleteBranch = async (id) => {
        if (!window.confirm('Delete this branch and all its subjects?')) return;

        try {
            await axios.delete(
                `http://localhost:5000/api/admin/subjects/branches/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Branch deleted successfully!');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete branch');
        }
    };

    // ============================================================
    // DELETE SUBJECT
    // ============================================================
    const handleDeleteSubject = async (id) => {
        if (!window.confirm('Delete this subject?')) return;

        try {
            await axios.delete(
                `http://localhost:5000/api/admin/subjects/subjects/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Subject deleted successfully!');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete subject');
        }
    };

    // ============================================================
    // RENDER
    // ============================================================
    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="admin-dashboard">
                        <p>Loading admin data...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="admin-dashboard">
                    <h1>🛠️ Admin Dashboard</h1>
                    <p>Welcome, {user?.name}! Manage branches, subjects, and upload materials here.</p>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <div className="admin-grid">
                        {/* Add Branch */}
                        <div className="admin-card">
                            <h2>➕ Add New Branch</h2>
                            <form onSubmit={handleAddBranch}>
                                <div className="form-group">
                                    <label>Branch Name</label>
                                    <input
                                        type="text"
                                        value={newBranch.name}
                                        onChange={(e) =>
                                            setNewBranch({ ...newBranch, name: e.target.value })
                                        }
                                        required
                                        placeholder="e.g., Electrical Engineering"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Branch Code</label>
                                    <input
                                        type="text"
                                        value={newBranch.code}
                                        onChange={(e) =>
                                            setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })
                                        }
                                        required
                                        placeholder="e.g., EE"
                                        maxLength="5"
                                    />
                                </div>
                                <button type="submit">Add Branch</button>
                            </form>

                            <h3 style={{ marginTop: '20px' }}>Current Branches</h3>
                            <ul className="item-list">
                                {branches.length === 0 ? (
                                    <li>No branches added yet.</li>
                                ) : (
                                    branches.map((branch) => (
                                        <li key={branch._id}>
                                            <span>
                                                <strong>{branch.code}</strong> - {branch.name}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteBranch(branch._id)}
                                                className="delete-btn"
                                            >
                                                Delete
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Add Subject */}
                        <div className="admin-card">
                            <h2>📚 Add New Subject</h2>
                            <form onSubmit={handleAddSubject}>
                                <div className="form-group">
                                    <label>Subject Name</label>
                                    <input
                                        type="text"
                                        value={newSubject.name}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, name: e.target.value })
                                        }
                                        required
                                        placeholder="e.g., Data Structures"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Subject Code</label>
                                    <input
                                        type="text"
                                        value={newSubject.code}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })
                                        }
                                        required
                                        placeholder="e.g., CS201"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Branch</label>
                                    <select
                                        value={newSubject.branch}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, branch: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map((branch) => (
                                            <option key={branch._id} value={branch._id}>
                                                {branch.code} - {branch.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Semester</label>
                                    <select
                                        value={newSubject.semester}
                                        onChange={(e) =>
                                            setNewSubject({ ...newSubject, semester: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select Semester</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                            <option key={s} value={s}>
                                                Semester {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit">Add Subject</button>
                            </form>

                            <h3 style={{ marginTop: '20px' }}>Current Subjects</h3>
                            <ul className="item-list">
                                {subjects.length === 0 ? (
                                    <li>No subjects added yet.</li>
                                ) : (
                                    subjects.map((subject) => (
                                        <li key={subject._id}>
                                            <span>
                                                <strong>{subject.code}</strong> - {subject.name}
                                                <br />
                                                <small>
                                                    {subject.branch?.code || 'No branch'} | Semester {subject.semester}
                                                </small>
                                            </span>
                                            <button
                                                onClick={() => handleDeleteSubject(subject._id)}
                                                className="delete-btn"
                                            >
                                                Delete
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* ============================================================ */}
                        {/* 📤 UPLOAD STUDY MATERIAL - THIS IS THE NEW SECTION */}
                        {/* ============================================================ */}
                        <div className="admin-card upload-card">
                            <NoteUpload />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;