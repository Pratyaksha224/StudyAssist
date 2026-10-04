import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Dashboard = () => {
    const { user, token } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(
                    'http://localhost:5000/api/stats/student',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setStats(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching stats:', err);
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        }
    }, [user, token]);

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <p>Loading dashboard...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="dashboard">
                    <div className="dashboard-header">
                        <h1>📚 Welcome, {user?.name}!</h1>
                    </div>

                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📝</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats?.totalQuizzes || 0}</span>
                                <span className="stat-label">Quizzes Taken</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🎯</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats?.overallAccuracy || 0}%</span>
                                <span className="stat-label">Accuracy</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🔥</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats?.studyStreak || 0}</span>
                                <span className="stat-label">Day Streak</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-info">
                                <span className="stat-value">{stats?.totalCorrect || 0}</span>
                                <span className="stat-label">Correct Answers</span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="dashboard-card">
                        <h2>Your Profile</h2>
                        <div className="profile-info">
                            <p><strong>Email:</strong> {user?.email}</p>
                            <p><strong>Branch:</strong> {user?.branch?.code || user?.branch || 'N/A'}</p>
                            <p><strong>Program:</strong> {user?.program}</p>
                            <p><strong>Semester:</strong> {user?.semester}</p>
                            <p><strong>Role:</strong> {user?.role}</p>
                        </div>
                    </div>

                    {/* Navigation Grid */}
                    <div className="dashboard-grid">
                        <Link to="/subjects" className="dashboard-card dashboard-link" style={{ textDecoration: 'none' }}>
                            <h3>📖 Your Subjects</h3>
                            <p>View all subjects for your branch and semester</p>
                        </Link>

                        <Link to="/quiz-history" className="dashboard-card dashboard-link" style={{ textDecoration: 'none' }}>
                            <h3>📝 Quiz History</h3>
                            <p>View your past quiz performance</p>
                        </Link>

                        <Link to="/leaderboard" className="dashboard-card dashboard-link" style={{ textDecoration: 'none' }}>
                            
                                <h3>🏆 Leaderboard</h3>
                                <p>See how you rank against other students</p>
                            
                        </Link>
                         <Link to="/edit-profile" className="dashboard-card dashboard-link" style={{ textDecoration: 'none' }}>
                            <h3>✏️ Edit Profile</h3>
                            <p>Update your branch, semester, or name</p>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;