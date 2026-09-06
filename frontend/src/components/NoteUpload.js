import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const NoteUpload = () => {
    const { token } = useAuth();
    const [branches, setBranches] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');

    // Upload form state
    const [formData, setFormData] = useState({
        subjectId: '',
        title: '',
        module: '',
        description: '',
        year: '',
        examType: 'End Sem',
        uploadType: 'note', // 'note' or 'pyq'
        file: null,
    });

    // Fetch branches and all subjects
    useEffect(() => {
        const fetchData = async () => {
            try {
                const branchesRes = await axios.get(
                    'http://localhost:5000/api/admin/subjects/branches',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setBranches(branchesRes.data);

                const subjectsRes = await axios.get(
                    'http://localhost:5000/api/admin/subjects/subjects',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setAllSubjects(subjectsRes.data);
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();
    }, [token]);

    // Filter subjects when branch or semester changes
    useEffect(() => {
        let filtered = allSubjects;

        if (selectedBranch) {
            filtered = filtered.filter(s => s.branch?._id === selectedBranch || s.branch === selectedBranch);
        }

        if (selectedSemester) {
            filtered = filtered.filter(s => s.semester === parseInt(selectedSemester));
        }

        setFilteredSubjects(filtered);

        // Reset subject selection when filters change
        setFormData(prev => ({ ...prev, subjectId: '' }));
    }, [selectedBranch, selectedSemester, allSubjects]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setFormData((prev) => ({
                ...prev,
                file: file,
            }));
            setError('');
        } else {
            setError('Please select a valid PDF file');
            e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validate
        if (!formData.subjectId || !formData.title || !formData.file) {
            setError('Please fill all required fields and select a file');
            setLoading(false);
            return;
        }

        const uploadData = new FormData();
        uploadData.append('subjectId', formData.subjectId);
        uploadData.append('title', formData.title);
        uploadData.append('file', formData.file);

        if (formData.uploadType === 'note') {
            uploadData.append('module', formData.module);
            uploadData.append('description', formData.description);
        } else {
            uploadData.append('year', formData.year);
            uploadData.append('examType', formData.examType);
            uploadData.append('description', formData.description);
        }

        try {
            const endpoint = formData.uploadType === 'note'
                ? 'http://localhost:5000/api/admin/upload/note'
                : 'http://localhost:5000/api/admin/upload/pyq';

            const response = await axios.post(endpoint, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
            });

            setSuccess(`✅ ${formData.uploadType === 'note' ? 'Note' : 'PYQ'} uploaded successfully!`);
            setFormData({
                subjectId: '',
                title: '',
                module: '',
                description: '',
                year: '',
                examType: 'End Sem',
                uploadType: 'note',
                file: null,
            });
            // Clear file input
            document.getElementById('fileInput').value = '';
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    // Get unique semesters from subjects
    const availableSemesters = [...new Set(allSubjects.map(s => s.semester))].sort();

    return (
        <div className="upload-section">
            <h2>📤 Upload Study Material</h2>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleSubmit} className="upload-form">
                {/* Upload Type */}
                <div className="form-group">
                    <label>Upload Type</label>
                    <select
                        name="uploadType"
                        value={formData.uploadType}
                        onChange={handleChange}
                        required
                    >
                        <option value="note">📄 Notes</option>
                        <option value="pyq">📝 PYQs (Past Year Questions)</option>
                    </select>
                </div>

                {/* ============================================================ */}
                {/* FILTERS: Branch + Semester */}
                {/* ============================================================ */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Filter by Branch</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="">All Branches</option>
                            {branches.map((branch) => (
                                <option key={branch._id} value={branch._id}>
                                    {branch.code} - {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Filter by Semester</label>
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                        >
                            <option value="">All Semesters</option>
                            {availableSemesters.map((sem) => (
                                <option key={sem} value={sem}>
                                    Semester {sem}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Subject Selection */}
                <div className="form-group">
                    <label>Subject</label>
                    <select
                        name="subjectId"
                        value={formData.subjectId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select Subject</option>
                        {filteredSubjects.length === 0 ? (
                            <option value="" disabled>
                                {selectedBranch || selectedSemester
                                    ? 'No subjects match filters'
                                    : 'No subjects available'}
                            </option>
                        ) : (
                            filteredSubjects.map((subject) => (
                                <option key={subject._id} value={subject._id}>
                                    {subject.code} - {subject.name} (Sem {subject.semester})
                                    {subject.branch?.code && ` • ${subject.branch.code}`}
                                </option>
                            ))
                        )}
                    </select>
                    {filteredSubjects.length > 0 && (
                        <small className="helper-text">
                            Showing {filteredSubjects.length} subject{filteredSubjects.length > 1 ? 's' : ''}
                            {selectedBranch && ' for selected branch'}
                            {selectedSemester && `, Semester ${selectedSemester}`}
                        </small>
                    )}
                </div>

                {/* Title */}
                <div className="form-group">
                    <label>Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g., Module 1 Notes"
                        required
                    />
                </div>

                {/* Note-specific fields */}
                {formData.uploadType === 'note' && (
                    <div className="form-group">
                        <label>Module (Optional)</label>
                        <input
                            type="text"
                            name="module"
                            value={formData.module}
                            onChange={handleChange}
                            placeholder="e.g., Module 1, Unit 2"
                        />
                    </div>
                )}

                {/* PYQ-specific fields */}
                {formData.uploadType === 'pyq' && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Year</label>
                                <input
                                    type="number"
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    placeholder="e.g., 2024"
                                    required
                                    min="2000"
                                    max="2030"
                                />
                            </div>
                            <div className="form-group">
                                <label>Exam Type</label>
                                <select
                                    name="examType"
                                    value={formData.examType}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="Mid Sem">Mid Sem</option>
                                    <option value="End Sem">End Sem</option>
                                    <option value="Quiz">Quiz</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}

                {/* Description */}
                <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Brief description of the material..."
                        rows="2"
                    />
                </div>

                {/* File Upload */}
                <div className="form-group">
                    <label>PDF File</label>
                    <input
                        id="fileInput"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        required
                    />
                    {formData.file && (
                        <small className="file-info">
                            📎 {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                        </small>
                    )}
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? 'Uploading...' : `📤 Upload ${formData.uploadType === 'note' ? 'Note' : 'PYQ'}`}
                </button>
            </form>
        </div>
    );
};

export default NoteUpload;