import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import config from '../config/config';

const ForumDiscussion = () => {
    // Fetch forum posts - limited to 10 for homepage display
    const { data: postsResponse, isLoading, error } = useQuery({
        queryKey: ['homepageForumPosts'],
        queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/forum/posts`, {
                params: {
                    page: 1,
                    limit: 10,
                    showOnHomepage: true // Only get posts that should be shown on homepage
                }
            });
            return response.data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: false
    });

    const posts = postsResponse?.posts || [];

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffMonth / 12);

        if (diffYear > 0) return `${diffYear} năm trước`;
        if (diffMonth > 0) return `${diffMonth} tháng trước`;
        if (diffDay > 0) return `${diffDay} ngày trước`;
        if (diffHour > 0) return `${diffHour} giờ trước`;
        if (diffMin > 0) return `${diffMin} phút trước`;
        return 'Vừa xong';
    };

    if (isLoading) {
        return (
            <div className="forum-discussion-section">
                <div className="forum-discussion-loading">
                    Đang tải thảo luận...
                </div>
            </div>
        );
    }

    if (error || !posts || posts.length === 0) {
        return (
            <div className="forum-discussion-section">
                <div className="forum-discussion-empty">
                    <Link to="/thao-luan" className="forum-discussion-empty-link">
                        Xem tất cả thảo luận
                    </Link>
                </div>
            </div>
        );
    }

    // Sort posts: pinned first, then by lastActivity
    const sortedPosts = [...posts].sort((a, b) => {
        // Pinned posts first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // Then sort by lastActivity (most recent first)
        // Fallback to approvedAt if available, then createdAt
        const dateA = new Date(a.lastActivity || a.approvedAt || a.createdAt);
        const dateB = new Date(b.lastActivity || b.approvedAt || b.createdAt);
        return dateB - dateA;
    });

    return (
        <div className="forum-discussion-section">
            <div className="forum-discussion-list">
                {sortedPosts.map(post => {
                    // Use lastActivity if available, fallback to approvedAt, then createdAt
                    const displayDate = post.lastActivity || post.approvedAt || post.createdAt;
                    
                    return (
                        <div key={post._id} className="forum-discussion-item">
                            <div className="forum-discussion-content">
                                <Link 
                                    to={`/thao-luan/${post.slug}`} 
                                    className="forum-discussion-title"
                                >
                                    {post.isPinned && (
                                        <i className="fas fa-thumbtack forum-pin-icon"></i>
                                    )}
                                    {post.title}
                                </Link>
                                <div className="forum-discussion-meta">
                                    <span className="forum-discussion-date">
                                        {getTimeAgo(displayDate)}
                                    </span>
                                    <span className="forum-discussion-separator">•</span>
                                    <span className="forum-discussion-comments">
                                        {post.commentCount || 0} bình luận
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ForumDiscussion;
