import React from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';  // Add this to your imports
const Dashboard = () => {
    const { user } = useAuth();

    if (!user) {
        return <div className="container">Loading...</div>;
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="dashboard">
                    <div className="dashboard-header">
                        <h1>📚 Welcome, {user.name}!</h1>
                    </div>

                    <div className="dashboard-card">
                        <h2>Your Profile</h2>
                        <div className="profile-info">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Branch:</strong> {user?.branch?.code || user?.branch || 'N/A'}</p>
                            <p><strong>Program:</strong> {user.program}</p>
                            <p><strong>Semester:</strong> {user.semester}</p>
                            <p><strong>Role:</strong> {user.role}</p>
                        </div>
                    </div>

                   <div className="dashboard-grid">
    {/* 📖 Your Subjects - Card with Link */}
    <Link to="/subjects" className="dashboard-card-link">
        <div className="dashboard-card">
            <h3>📖 Your Subjects</h3>
            <p>View all subjects for your branch and semester</p>
        </div>
    </Link>

    {/* 📝 Recent Quizzes */}
    <div className="dashboard-card">
        <h3>📝 Recent Quizzes</h3>
        <p>Coming soon...</p>
    </div>

    {/* 🏆 Leaderboard */}
    <div className="dashboard-card">
        <h3>🏆 Leaderboard</h3>
        <p>Coming soon...</p>
    </div>
    <div className="dashboard-card">
    <Link to="/edit-profile" className="edit-profile-link">
        <h3>✏️ Edit Profile</h3>
        <p>Update your branch or semester</p>
    </Link>
</div>
</div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;