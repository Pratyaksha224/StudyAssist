import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Leaderboard = () => {
    const { user, token } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        branch: user?.branch || '',
        semester: user?.semester || '',
    });
    const [branches, setBranches] = useState([]);

    // ============================================================
    // FETCH BRANCHES - USING PUBLIC ENDPOINT
    // ============================================================
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                console.log('📤 Fetching branches...');
                const response = await axios.get(
                    'http://localhost:5000/api/stats/branches',  // ← CHANGED THIS
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log('📥 Branches received:', response.data);
                setBranches(response.data);
            } catch (err) {
                console.error('Error fetching branches:', err);
            }
        };
        fetchBranches();
    }, [token]);

    // ============================================================
    // FETCH LEADERBOARD
    // ============================================================
    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const params = {};
                if (filters.branch) params.branch = filters.branch;
                if (filters.semester) params.semester = filters.semester;

                console.log('📤 Fetching leaderboard with params:', params);

                const response = await axios.get(
                    'http://localhost:5000/api/stats/leaderboard',
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        params: params,
                    }
                );
                console.log('📥 Leaderboard received:', response.data);
                setLeaderboard(response.data.leaderboard);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [filters, token]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const isCurrentUser = (userId) => {
        return user?._id === userId;
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <p>Loading leaderboard...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="leaderboard-container">
                    <h1>🏆 Leaderboard</h1>

                    {/* Filters */}
                    <div className="leaderboard-filters">
                        <div className="filter-group">
                            <label>Branch</label>
                            <select
                                name="branch"
                                value={filters.branch}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Branches</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id}>
                                        {b.code} - {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Semester</label>
                            <select
                                name="semester"
                                value={filters.semester}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Semesters</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                    <option key={s} value={s}>
                                        Semester {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Leaderboard Table */}
                    {leaderboard.length === 0 ? (
                        <div className="empty-state">
                            <p>No students found with the selected filters.</p>
                        </div>
                    ) : (
                        <div className="leaderboard-table-wrapper">
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Student</th>
                                        <th>Branch</th>
                                        <th>Semester</th>
                                        <th>Quizzes</th>
                                        <th>Accuracy</th>
                                        <th>Streak</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((student) => (
                                        <tr
                                            key={student.userId}
                                            className={isCurrentUser(student.userId) ? 'current-user' : ''}
                                        >
                                            <td className="rank-cell">
                                                <span className="rank-badge">
                                                    {getRankEmoji(student.rank)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="student-name">
                                                    {student.name}
                                                    {isCurrentUser(student.userId) && (
                                                        <span className="you-badge">You</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{student.branch?.code || 'N/A'}</td>
                                            <td>{student.semester || 'N/A'}</td>
                                            <td>{student.totalQuizzes}</td>
                                            <td>
                                                <span className={`accuracy-badge ${student.accuracy >= 70 ? 'high' : student.accuracy >= 40 ? 'medium' : 'low'}`}>
                                                    {student.accuracy}%
                                                </span>
                                            </td>
                                            <td>🔥 {student.studyStreak || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="leaderboard-stats">
                        <p>Total Students: {leaderboard.length}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Leaderboard;