import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import config from '../config/config';
import { generateUserProfileUrl } from '../utils/slugUtils';
import LoadingSpinner from './LoadingSpinner';

const BlogSection = () => {
    // Fetch homepage blog posts - limited to 8
    const { data: blogResponse, isLoading, error } = useQuery({
        queryKey: ['homepageBlogPosts'],
        queryFn: async () => {
            const response = await axios.get(`${config.backendUrl}/api/users/blog-posts/homepage`, {
                params: {
                    limit: 8
                }
            });
            return response.data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: false
    });

    const posts = blogResponse?.posts || [];

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
            <div className="blog-section">
                <div className="blog-section-header">
                    <h3>
                        <i className="fa-solid fa-pen-to-square"></i>
                        Blog
                    </h3>
                </div>
                <div className="blog-section-loading">
                    <LoadingSpinner size="small" text="Đang tải blog..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="blog-section">
                <div className="blog-section-header">
                    <h3>
                        <i className="fa-solid fa-pen-to-square"></i>
                        Blog
                    </h3>
                </div>
                <div className="blog-section-error">
                    <span>Không thể tải blog.</span>
                </div>
            </div>
        );
    }

    if (!posts || posts.length === 0) {
        return (
            <div className="blog-section">
                <div className="blog-section-header">
                    <h3>
                        <i className="fa-solid fa-pen-to-square"></i>
                        Blog
                    </h3>
                </div>
                <div className="blog-section-empty">
                    <span>Chưa có bài blog nào.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="blog-section">
            <div className="blog-section-header">
                <h3>
                    <i className="fa-solid fa-pen-to-square"></i>
                    Blog
                </h3>
            </div>
            
            <div className="blog-list">
                {posts.map((post) => (
                    <div key={post._id} className="blog-item">
                        <div className="blog-item-content">
                            <Link 
                                to={`${generateUserProfileUrl(post.author)}?tab=blog`}
                                className="blog-item-title"
                                title={post.title}
                            >
                                {post.title}
                            </Link>
                            <div className="blog-item-meta">
                                <Link 
                                    to={generateUserProfileUrl(post.author)}
                                    className="blog-item-author"
                                >
                                    {post.author.displayName || post.author.username}
                                </Link>
                                <span className="blog-item-date">
                                    {getTimeAgo(post.createdAt)}
                                </span>
                                <div className="blog-item-likes">
                                    <i className="fa-solid fa-heart"></i>
                                    <span>{post.likesCount || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlogSection;
