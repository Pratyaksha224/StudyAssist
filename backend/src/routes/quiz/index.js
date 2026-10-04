const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const Subject = require('../../models/Subject');
const Note = require('../../models/Note');
const PYQ = require('../../models/PYQ');
const Quiz = require('../../models/Quiz');
const QuizResult = require('../../models/QuizResult');
const User = require('../../models/User');

// ============================================================
// GEMINI SETUP


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

// ============================================================
// HELPER: Shuffle array (Fisher-Yates algorithm)
// ============================================================
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// ============================================================
// HELPER: Get subject content for quiz generation
// ============================================================
const getSubjectContent = async (subjectId) => {
    try {
        const notes = await Note.find({ subject: subjectId });
        const pyqs = await PYQ.find({ subject: subjectId });

        let allText = '';

        if (notes.length > 0) {
            allText += '\n=== NOTES ===\n';
            for (const note of notes) {
                allText += `\n[${note.title}]\n`;
                if (note.content && note.content.length > 0) {
                    allText += note.content.substring(0, 3000) + '\n';
                }
            }
        }

        if (pyqs.length > 0) {
            allText += '\n=== PYQs ===\n';
            for (const pyq of pyqs) {
                allText += `\n[${pyq.title} - Year: ${pyq.year}]\n`;
                if (pyq.content && pyq.content.length > 0) {
                    allText += pyq.content.substring(0, 3000) + '\n';
                }
            }
        }

        return allText;
    } catch (error) {
        console.error('Error getting subject content:', error);
        throw error;
    }
};

// ============================================================
// GENERATE QUIZ
// ============================================================
router.post('/generate', async (req, res) => {
    try {
        const { subjectId, difficulty, numQuestions } = req.body;

        console.log('📤 Quiz generation request:', { subjectId, difficulty, numQuestions });

        if (!subjectId) {
            return res.status(400).json({ error: 'Subject ID is required' });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        console.log('📚 Subject found:', subject.name);

        const content = await getSubjectContent(subjectId);
        console.log('📄 Content length:', content?.length || 0);

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                error: 'No study materials uploaded for this subject yet. Please upload notes or PYQs first.',
            });
        }

        const numQ = numQuestions || 10;
        const diff = difficulty || 'medium';

        const randomSeed = Math.floor(Math.random() * 10000);
        console.log('🎲 Random seed:', randomSeed);

        const existingQuizzes = await Quiz.find({ subject: subjectId })
            .sort({ createdAt: -1 })
            .limit(5);
        
        let existingQuestions = [];
        for (const quiz of existingQuizzes) {
            for (const q of quiz.questions) {
                existingQuestions.push(q.question);
            }
        }
        console.log('📚 Existing questions count:', existingQuestions.length);

        const prompt = `
You are a quiz generator for the subject "${subject.name}".

Based on the following study materials, generate ${numQ} multiple-choice questions (MCQs) at ${diff} difficulty level.

STUDY MATERIALS:
${content.substring(0, 8000)}

IMPORTANT - AVOID REPETITION:
- DO NOT repeat these previously asked questions: ${existingQuestions.join(' | ')}
- Generate questions on DIFFERENT topics than before

VARIETY INSTRUCTIONS:
1. Each quiz should cover DIFFERENT topics from the materials
2. Vary the question types:
   - Some conceptual questions
   - Some numerical/problem-based questions
   - Some application-based questions
   - Some definition-based questions
3. If there are multiple topics, pick questions from RANDOM different topics
4. Make questions interesting and challenging

INSTRUCTIONS:
1. Generate exactly ${numQ} multiple-choice questions
2. Each question must have exactly 4 options
3. Mark the correct answer (0-3 index)
4. Provide a brief explanation for the correct answer

OUTPUT FORMAT (valid JSON only):
{
  "title": "Quiz on ${subject.name} - ${new Date().toLocaleDateString()}",
  "questions": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this is correct"
    }
  ]
}

Return ONLY the JSON, no other text.
`;

        console.log('📤 Sending to Gemini with seed:', randomSeed);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('📥 Gemini response length:', responseText.length);

        let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}') + 1;
        if (start === -1 || end === 0) {
            console.error('No JSON found in response:', cleanText);
            return res.status(500).json({
                error: 'Failed to generate quiz. Invalid response format.',
            });
        }
        cleanText = cleanText.substring(start, end);

        let quizData;
        try {
            quizData = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.log('Raw response:', cleanText);
            return res.status(500).json({
                error: 'Failed to generate quiz. Please try again.',
            });
        }

        if (!quizData.questions || quizData.questions.length === 0) {
            return res.status(500).json({
                error: 'Generated quiz has no questions. Please try again.',
            });
        }

        const shuffledQuestions = shuffleArray(quizData.questions);

        const quiz = new Quiz({
            subject: subjectId,
            title: quizData.title || `Quiz on ${subject.name} - ${new Date().toLocaleDateString()}`,
            questions: shuffledQuestions,
            difficulty: diff,
            totalQuestions: shuffledQuestions.length,
            createdBy: req.userId,
        });

        await quiz.save();

        res.status(201).json({
            message: '✅ Quiz generated successfully!',
            quiz: {
                id: quiz._id,
                title: quiz.title,
                questions: shuffledQuestions,
                totalQuestions: shuffledQuestions.length,
            },
        });

    } catch (error) {
        console.error('❌ Quiz generation error:', error);
        res.status(500).json({
            error: 'Failed to generate quiz: ' + error.message,
        });
    }
});

// ============================================================
// SUBMIT QUIZ
// ============================================================
router.post('/submit', async (req, res) => {
    try {
        console.log('📤 Quiz submission received');
        console.log('  Quiz ID:', req.body.quizId);
        console.log('  Answers:', req.body.answers);

        const { quizId, answers } = req.body;

        if (!quizId || !answers) {
            return res.status(400).json({
                error: 'Quiz ID and answers are required',
            });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        // Calculate score
        let score = 0;
        const results = [];
        for (let i = 0; i < quiz.questions.length; i++) {
            const q = quiz.questions[i];
            const userAnswer = answers[i] !== undefined ? answers[i] : -1;
            const isCorrect = userAnswer === q.correctAnswer;
            if (isCorrect) score++;
            results.push({
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                explanation: q.explanation || '',
            });
        }

        const totalQuestions = quiz.questions.length;
        const percentage = Math.round((score / totalQuestions) * 100);

        // Save result
        const quizResult = new QuizResult({
            quiz: quizId,
            student: req.userId,
            answers: answers,
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage,
        });

        await quizResult.save();

        console.log('✅ Quiz result saved. Score:', score, '/', totalQuestions);

        // ============================================================
        // UPDATE USER STATS
        // ============================================================
        const user = await User.findById(req.userId);
        if (user) {
            console.log('👤 User found:', user.name);
            console.log('📊 Current stats:', user.stats);

            // Calculate new stats
            const totalQuizzes = (user.stats?.totalQuizzes || 0) + 1;
            const totalCorrect = (user.stats?.totalCorrect || 0) + score;
            const totalAttempted = (user.stats?.totalAttempted || 0) + totalQuestions;

            // Calculate streak
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let streak = user.stats?.studyStreak || 0;
            const lastActivity = user.stats?.lastActivityDate;
            
            if (lastActivity) {
                const lastDate = new Date(lastActivity);
                lastDate.setHours(0, 0, 0, 0);
                const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                
                console.log('📅 Last activity:', lastDate.toDateString());
                console.log('📅 Today:', today.toDateString());
                console.log('📅 Diff days:', diffDays);
                
                if (diffDays === 0) {
                    console.log('ℹ️ Already active today');
                } else if (diffDays === 1) {
                    streak++;
                    console.log('🔥 Streak increased to:', streak);
                } else {
                    streak = 1;
                    console.log('🔄 Streak reset to 1');
                }
            } else {
                streak = 1;
                console.log('🔥 First activity, streak set to 1');
            }

            // Update stats
            const updatedUser = await User.findByIdAndUpdate(
                req.userId,
                {
                    $set: {
                        'stats.totalQuizzes': totalQuizzes,
                        'stats.totalCorrect': totalCorrect,
                        'stats.totalAttempted': totalAttempted,
                        'stats.averageScore': totalAttempted > 0
                            ? Math.round((totalCorrect / totalAttempted) * 100)
                            : 0,
                        'stats.studyStreak': streak,
                        'stats.lastActivityDate': today,
                    },
                },
                { new: true, returnDocument: 'after' }
            );

            console.log('✅ Stats updated:', updatedUser.stats);
        }

        res.json({
            message: '✅ Quiz submitted!',
            score: score,
            totalQuestions: totalQuestions,
            percentage: percentage,
            results: results,
            quizResultId: quizResult._id,
        });

    } catch (error) {
        console.error('❌ Quiz submission error:', error);
        res.status(500).json({
            error: 'Failed to submit quiz: ' + error.message,
        });
    }
});

// ============================================================
// GET QUIZ BY ID
// ============================================================
router.get('/:quizId', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.quizId);
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        res.json(quiz);
    } catch (error) {
        console.error('❌ Error fetching quiz:', error);
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

// ============================================================
// GET QUIZ RESULTS FOR A STUDENT
// ============================================================
router.get('/results/:quizId', async (req, res) => {
    try {
        const results = await QuizResult.find({
            quiz: req.params.quizId,
            student: req.userId,
        });
        res.json(results);
    } catch (error) {
        console.error('❌ Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

module.exports = router;