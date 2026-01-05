import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import './ArticleFetcher.css';

const ArticleFetcher = ({ onArticleFetched }) => {
    const { isConnected } = useAppContext();
    const [journalId, setJournalId] = useState('');
    const [articleId, setArticleId] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [progress, setProgress] = useState({ percent: 0, message: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!journalId.trim()) {
            setError('Journal ID is required');
            return;
        }
        if (!articleId.trim()) {
            setError('Article ID is required');
            return;
        }

        setError('');
        setIsFetching(true);
        setProgress({ percent: 10, message: 'Connecting to server...' });

        try {
            setProgress({ percent: 30, message: 'Fetching from S3...' });

            const response = await fetch('http://localhost:8081/api/fetch-article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    journalId: journalId.trim(),
                    articleId: articleId.trim(),
                }),
            });

            setProgress({ percent: 70, message: 'Processing response...' });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch article');
            }

            setProgress({ percent: 100, message: 'Complete!' });

            console.log('✅ Article fetched:', data);

            // Call the callback with the fetched data
            if (onArticleFetched) {
                onArticleFetched({
                    journalId: data.journalId,
                    articleId: data.articleId,
                    pdfUrl: `http://localhost:8081${data.pdfUrl}`,
                    jsonUrl: `http://localhost:8081${data.jsonUrl}`,
                    pdfBase64: data.pdfBase64,
                    jsonData: data.jsonData,
                    fileTree: data.fileTree,
                });
            }

            // Reset progress after short delay
            setTimeout(() => {
                setProgress({ percent: 0, message: '' });
            }, 2000);

        } catch (err) {
            console.error('❌ Fetch error:', err);
            setError(err.message);
            setProgress({ percent: 0, message: '' });
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="article-fetcher">
            <h3 className="fetcher-title">📥 Fetch Article from S3</h3>

            <form onSubmit={handleSubmit} className="fetcher-form">
                <div className="form-group">
                    <label htmlFor="journal-id">Journal ID</label>
                    <input
                        type="text"
                        id="journal-id"
                        value={journalId}
                        onChange={(e) => setJournalId(e.target.value)}
                        placeholder="e.g., EAAI"
                        disabled={isFetching}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="article-id">Article ID</label>
                    <input
                        type="text"
                        id="article-id"
                        value={articleId}
                        onChange={(e) => setArticleId(e.target.value)}
                        placeholder="e.g., 108923"
                        disabled={isFetching}
                    />
                </div>

                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}

                {isFetching && (
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                        <div className="progress-text">
                            {progress.message || 'Fetching...'}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className={`fetch-btn ${isFetching ? 'fetching' : ''}`}
                    disabled={isFetching}
                >
                    {isFetching ? (
                        <>
                            <span className="spinner" />
                            Fetching...
                        </>
                    ) : (
                        <>
                            <span>📥</span>
                            Fetch Article
                        </>
                    )}
                </button>
            </form>

            {!isConnected && (
                <div className="connection-warning">
                    ⚠️ Server connection recommended for full features
                </div>
            )}
        </div>
    );
};

export default ArticleFetcher;

