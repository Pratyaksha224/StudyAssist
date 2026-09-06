import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const EditProfile = () => {
    // ============================================================
    // 1. ADD refreshUser HERE (with user and token)
    // ============================================================
    const { user, token, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        branch: '',
        program: '',
        semester: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                branch: user.branch || '',
                program: user.program || '',
                semester: user.semester || '',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await axios.put(
                'http://localhost:5000/api/profile/update',
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess('✅ Profile updated successfully!');

            // ============================================================
            // 2. ADD refreshUser HERE (after successful update)
            // ============================================================
            await refreshUser();  // Refresh the user data in context

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <>
                <Navbar />
                <div className="container">Loading...</div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="auth-container">
                    <div className="auth-card">
                        <h1>✏️ Edit Profile</h1>
                        <h2>Update your details</h2>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Branch</label>
                                <select
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="EE">Electrical (EE)</option>
                                    <option value="CS">Computer Science (CS)</option>
                                    <option value="ME">Mechanical (ME)</option>
                                    <option value="CE">Civil (CE)</option>
                                    <option value="ECE">Electronics (ECE)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Program</label>
                                <select
                                    name="program"
                                    value={formData.program}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="BTECH">B.Tech</option>
                                    <option value="DUAL">Dual Degree</option>
                                    <option value="MTECH">M.Tech</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Semester</label>
                                <select
                                    name="semester"
                                    value={formData.semester}
                                    onChange={handleChange}
                                    required
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                                        <option key={s} value={s}>
                                            Semester {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" disabled={loading}>
                                {loading ? 'Updating...' : 'Update Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EditProfile;