import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Navbar from '../components/Navbar';

const QuizHistory = () => {
    const { token } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await axios.get(
                    'http://localhost:5000/api/stats/student',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setHistory(response.data.recentHistory || []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching history:', err);
                setLoading(false);
            }
        };

        fetchHistory();
    }, [token]);

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <p>Loading quiz history...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="quiz-history">
                    <h1>📝 Quiz History</h1>

                    {history.length === 0 ? (
                        <div className="empty-state">
                            <p>You haven't taken any quizzes yet.</p>
                            <p>Go to a subject and generate a quiz to get started!</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {history.map((quiz, idx) => (
                                <div key={idx} className="history-item">
                                    <div className="history-info">
                                        <h4>{quiz.quizTitle}</h4>
                                        <p className="history-subject">{quiz.subjectName}</p>
                                        <p className="history-date">
                                            {new Date(quiz.completedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="history-score">
                                        <span className="score-number">{quiz.score}</span>
                                        <span className="score-total">/{quiz.totalQuestions}</span>
                                        <span className="score-percentage">({quiz.percentage}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default QuizHistory;