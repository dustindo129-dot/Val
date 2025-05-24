/**
 * Novel.jsx
 * 
 * Component that displays a list of novels with their details.
 * Features:
 * - Paginated novel list
 * - Search functionality
 * - Real-time updates via SSE
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import HotNovels from './components/HotNovels';
import NovelList from './components/NovelList';
import './Novel.css';
import config from '../config/config';
import sseService from './services/sseService';
import { StarIcon } from "./components/Icons";
import LoadingSpinner from './components/LoadingSpinner';

// Novel component with optional search query prop
const Novel = ({ searchQuery = "" }) => {
  const { page } = useParams();
  const navigate = useNavigate();
  const currentPage = parseInt(page) || 1;
  const queryClient = useQueryClient();

  // Set up SSE connection for real-time updates
  useEffect(() => {
    // Define event handlers
    const handleUpdate = () => {
      console.log('Novel update event received');
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] });
    };

    const handleStatusChange = (data) => {
      console.log(`Novel status changed: "${data.title}" to "${data.status}"`);
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] }, { force: true });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] }, { force: true });
    };

    const handleNovelDelete = (data) => {
      console.log(`Novel deleted: "${data.title}" (ID: ${data.id})`);
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.invalidateQueries({ queryKey: ['hotNovels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] }, { force: true });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] }, { force: true });
    };

    const handleRefresh = () => {
      console.log('Full refresh requested from server');
      queryClient.invalidateQueries();
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] }, { force: true });
      queryClient.refetchQueries({ queryKey: ['hotNovels'] }, { force: true });
    };

    const handleNewNovel = () => {
      console.log('New novel added');
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] });
    };

    const handleNewChapter = (data) => {
      console.log(`New chapter "${data.chapterTitle}" added to "${data.novelTitle}"`);
      queryClient.invalidateQueries({ queryKey: ['novels'] });
      queryClient.refetchQueries({ queryKey: ['novels', currentPage] });
    };

    const handleNewComment = () => {
      console.log('New comment added');
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.refetchQueries({ queryKey: ['recentComments'] });
    };

    // Add event listeners
    sseService.addEventListener('update', handleUpdate);
    sseService.addEventListener('novel_status_changed', handleStatusChange);
    sseService.addEventListener('novel_deleted', handleNovelDelete);
    sseService.addEventListener('refresh', handleRefresh);
    sseService.addEventListener('new_novel', handleNewNovel);
    sseService.addEventListener('new_chapter', handleNewChapter);
    sseService.addEventListener('new_comment', handleNewComment);

    // Clean up on unmount
    return () => {
      sseService.removeEventListener('update', handleUpdate);
      sseService.removeEventListener('novel_status_changed', handleStatusChange);
      sseService.removeEventListener('novel_deleted', handleNovelDelete);
      sseService.removeEventListener('refresh', handleRefresh);
      sseService.removeEventListener('new_novel', handleNewNovel);
      sseService.removeEventListener('new_chapter', handleNewChapter);
      sseService.removeEventListener('new_comment', handleNewComment);
    };
  }, [currentPage, queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['novels', currentPage],
    queryFn: async () => {
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = new Date().getTime();
      const response = await axios.get(`${config.backendUrl}/api/novels?page=${currentPage}&_cb=${cacheBuster}`);
      return response.data;
    },
    staleTime: 0, // Data is immediately stale
    cacheTime: 1000 * 60, // Only cache for 1 minute max
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 10000, // Refresh every 30 seconds if tab stays open
    keepPreviousData: true // Keep showing previous page data while loading next page
  });

  if (isLoading) return <div className="loading"><LoadingSpinner size="large" text="Đang tải truyện..." /></div>;
  if (error) return <div className="error">{error.message}</div>;

  return (
    <>
      <h1 className="welcome-heading">
        Chào mừng đến với Valvrareteam - Thế giới Light Novel dành cho bạn!
      </h1>
      <div className="novels-container">
        <div className="main-content">
          {/* Section header */}
          <div className="section-header">
            <h2 className="section-title">
              MỚI CẬP NHẬT 
              <StarIcon className="title-icon" />
            </h2>
          </div>
  
          {/* Novel list component */}
          <NovelList 
            novels={data?.novels || []} 
            pagination={data?.pagination}
            searchQuery={searchQuery}
          />
        </div>
  
        {/* Sidebar with hot novels */}
        <aside className="sidebar">
          <HotNovels />
        </aside>
      </div>
    </>
  );
};

export default Novel; 