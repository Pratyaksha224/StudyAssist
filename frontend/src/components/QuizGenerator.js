import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const QuizGenerator = ({ subjectId, subjectName }) => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [settings, setSettings] = useState({
        difficulty: 'medium',
        numQuestions: 10,
    });

    const generateQuiz = async () => {
        setLoading(true);
        setQuiz(null);
        setSubmitted(false);
        setResult(null);
        setAnswers({});

        try {
            const response = await axios.post(
                'http://localhost:5000/api/quiz/generate',
                {
                    subjectId: subjectId,
                    difficulty: settings.difficulty,
                    numQuestions: settings.numQuestions,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setQuiz(response.data.quiz);
        } catch (err) {
            console.error('Error generating quiz:', err);
            alert(err.response?.data?.error || 'Failed to generate quiz');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionIndex, optionIndex) => {
        setAnswers((prev) => ({
            ...prev,
            [questionIndex]: optionIndex,
        }));
    };

    const submitQuiz = async () => {
        if (Object.keys(answers).length < quiz.questions.length) {
            alert(`Please answer all ${quiz.questions.length} questions before submitting.`);
            return;
        }

        setLoading(true);

        try {
            const answerArray = quiz.questions.map((_, index) => answers[index] ?? -1);
            const response = await axios.post(
                'http://localhost:5000/api/quiz/submit',
                {
                    quizId: quiz.id,
                    answers: answerArray,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setResult(response.data);
            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting quiz:', err);
            alert(err.response?.data?.error || 'Failed to submit quiz');
        } finally {
            setLoading(false);
        }
    };

    const resetQuiz = () => {
        setQuiz(null);
        setSubmitted(false);
        setResult(null);
        setAnswers({});
    };

    return (
        <div className="quiz-container">
            {/* Settings Panel */}
            {!quiz && !loading && (
                <div className="quiz-settings">
                    <h3>📝 Quiz Settings</h3>
                    <div className="settings-row">
                        <div className="form-group">
                            <label>Difficulty</label>
                            <select
                                value={settings.difficulty}
                                onChange={(e) =>
                                    setSettings({ ...settings, difficulty: e.target.value })
                                }
                            >
                                <option value="easy">🟢 Easy</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="hard">🔴 Hard</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Number of Questions</label>
                            <select
                                value={settings.numQuestions}
                                onChange={(e) =>
                                    setSettings({ ...settings, numQuestions: parseInt(e.target.value) })
                                }
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={20}>20</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={generateQuiz} className="generate-btn">
                        🚀 Generate Quiz
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="quiz-loading">
                    <p>⏳ Generating your quiz...</p>
                    <p className="hint">This may take a few seconds</p>
                </div>
            )}

            {/* Quiz Display */}
            {quiz && !submitted && (
                <div className="quiz-display">
                    <div className="quiz-header">
                        <h3>{quiz.title}</h3>
                        <div className="quiz-info">
                            <span>📝 {quiz.questions.length} questions</span>
                            <span>📊 {settings.difficulty}</span>
                        </div>
                    </div>

                    <div className="questions-list">
                        {quiz.questions.map((q, idx) => (
                            <div key={idx} className="question-item">
                                <h4>
                                    Q{idx + 1}. {q.question}
                                </h4>
                                <div className="options-list">
                                    {q.options.map((option, optIdx) => (
                                        <label key={optIdx} className="option-label">
                                            <input
                                                type="radio"
                                                name={`q${idx}`}
                                                value={optIdx}
                                                checked={answers[idx] === optIdx}
                                                onChange={() => handleAnswerSelect(idx, optIdx)}
                                            />
                                            {option}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="quiz-actions">
                        <button onClick={submitQuiz} className="submit-btn" disabled={loading}>
                            {loading ? '⏳ Submitting...' : '📤 Submit Quiz'}
                        </button>
                        <button onClick={resetQuiz} className="reset-btn">
                            🔄 Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            {submitted && result && (
                <div className="quiz-results">
                    <h3>🎉 Quiz Complete!</h3>
                    <div className="score-display">
                        <div className="score-circle">
                            <span className="score-number">{result.score}</span>
                            <span className="score-total">/{result.totalQuestions}</span>
                        </div>
                        <div className="score-percentage">{result.percentage}%</div>
                    </div>

                    <div className="results-details">
                        <div className="result-stats">
                            <div className="stat correct">
                                <span className="stat-label">✅ Correct</span>
                                <span>{result.score}</span>
                            </div>
                            <div className="stat incorrect">
                                <span className="stat-label">❌ Incorrect</span>
                                <span>{result.totalQuestions - result.score}</span>
                            </div>
                            <div className="stat accuracy">
                                <span className="stat-label">📊 Accuracy</span>
                                <span>{result.percentage}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="questions-review">
                        <h4>📋 Review Answers</h4>
                        {result.results.map((item, idx) => (
                            <div
                                key={idx}
                                className={`review-item ${item.isCorrect ? 'correct' : 'incorrect'}`}
                            >
                                <div className="review-header">
                                    <span>Q{idx + 1}. {item.question}</span>
                                    <span className={`status-badge ${item.isCorrect ? 'correct' : 'incorrect'}`}>
                                        {item.isCorrect ? '✅' : '❌'}
                                    </span>
                                </div>
                                <div className="review-details">
                                    <div className="review-answer">
                                        <span className="label">Your answer:</span>
                                        <span className={item.isCorrect ? 'correct-text' : 'incorrect-text'}>
                                            {item.userAnswer >= 0 ? item.options[item.userAnswer] : 'Not answered'}
                                        </span>
                                    </div>
                                    {!item.isCorrect && (
                                        <div className="review-answer correct-answer">
                                            <span className="label">Correct answer:</span>
                                            <span>{item.options[item.correctAnswer]}</span>
                                        </div>
                                    )}
                                    {item.explanation && (
                                        <div className="review-explanation">
                                            <span className="label">💡 Explanation:</span>
                                            <span>{item.explanation}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="quiz-actions">
                        <button onClick={resetQuiz} className="retry-btn">
                            🔄 Try Another Quiz
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizGenerator;