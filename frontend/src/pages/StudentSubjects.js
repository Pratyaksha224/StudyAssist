import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const StudentSubjects = () => {
    const { user, token } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubjects = async () => {
            if (!user) return;

            try {
                const response = await axios.get(
                    `http://localhost:5000/api/subjects/student`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            branch: user.branch,
                            semester: user.semester,
                        },
                    }
                );
                setSubjects(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching subjects:', err);
                setError('Failed to load your subjects');
                setLoading(false);
            }
        };

        fetchSubjects();
    }, [user, token]);

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <p>Loading your subjects...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="subjects-dashboard">
                    <h1>📚 Your Subjects</h1>
      <p className="subtitle">
    {user?.branch?.code || user?.branch || 'No Branch'} - Semester {user?.semester}
</p>

                    {error && <div className="error-message">{error}</div>}

                    {subjects.length === 0 ? (
                        <div className="empty-state">
                            <p>No subjects found for your branch and semester.</p>
                            <p>Contact your admin to add subjects.</p>
                        </div>
                    ) : (
                        <div className="subjects-grid">
                            {subjects.map((subject) => (
                                <Link
                                    to={`/subject/${subject._id}`}
                                    key={subject._id}
                                    className="subject-card"
                                >
                                    <div className="subject-icon">📖</div>
                                    <div className="subject-info">
                                        <h3>{subject.name}</h3>
                                        <p className="subject-code">{subject.code}</p>
                                        <p className="subject-semester">Semester {subject.semester}</p>
                                    </div>
                                    <div className="subject-arrow">→</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default StudentSubjects;