import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/ReportPanel.css';
import { createUniqueSlug } from '../utils/slugUtils';
import LoadingSpinner from './LoadingSpinner';

const ReportPanel = ({ user }) => {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [responseMessages, setResponseMessages] = useState({});

  // Only show for admin and moderator users
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null;
  }

  // Fetch reports
  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['reports', 'pending'],
    queryFn: () => api.getReports('pending'),
    refetchInterval: 60000, // Refetch every minute
  });

  // Resolve report mutation
  const resolveMutation = useMutation({
    mutationFn: ({ reportId, responseMessage }) => api.resolveReport(reportId, responseMessage),
    onSuccess: () => {
      // Invalidate reports query to refetch data
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      // Clear the response message for this report
      setResponseMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[resolveMutation.variables?.reportId];
        return newMessages;
      });
    },
  });

  const handleResolve = (reportId) => {
    const responseMessage = responseMessages[reportId] || '';
    resolveMutation.mutate({ reportId, responseMessage });
  };

  const handleResponseMessageChange = (reportId, message) => {
    setResponseMessages(prev => ({
      ...prev,
      [reportId]: message
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Function to generate content link based on content type
  const getContentLink = (report) => {
    if (report.contentType === 'chapter' && report.contentId) {
      // For chapters, we need both novelId and contentTitle (chapter title)
      if (report.novelId && report.contentTitle) {
        // Create chapter slug from chapter title and chapter ID
        const chapterSlug = createUniqueSlug(report.contentTitle, report.contentId);
        // Use the novelId directly in the URL path for now
        // This will work with the slug lookup system that can handle both slugs and IDs
        return `/novel/${report.novelId}/chapter/${chapterSlug}`;
      } else {
        // Fallback to direct chapter ID route
        return `/chapters/${report.contentId}`;
      }
    } else if (report.contentType === 'novel' && report.contentId) {
      if (report.contentTitle) {
        const novelSlug = createUniqueSlug(report.contentTitle, report.contentId);
        return `/novel/${novelSlug}`;
      } else {
        return `/novel/${report.contentId}`;
      }
    } else {
      return '#'; // Fallback if no valid link can be generated
    }
  };

  return (
    <div className="report-panel">
      <div className="report-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>Báo cáo {reports.length > 0 && `(${reports.length})`}</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="report-panel-content">
          {isLoading ? (
            <div className="report-loading">
              <LoadingSpinner size="small" text="Đang tải báo cáo..." />
            </div>
          ) : error ? (
            <div className="report-error">Không thể tải báo cáo</div>
          ) : reports.length === 0 ? (
            <div className="no-reports">Không có báo cáo chờ xử lý</div>
          ) : (
            <div className="report-list">
              {reports.map(report => (
                <div key={report._id} className="report-card">
                  <div className="report-meta">
                    <div className="reporter-info">
                      {report.reporter?.displayName || report.reporter?.username || 'Anonymous'}
                    </div>
                    <div className="report-timestamp">
                      {formatDate(report.createdAt)}
                    </div>
                  </div>
                  <div className="report-content-info">
                    <div className="report-type">
                      {report.reportType}
                    </div>
                    <div className="report-content-type">
                      {report.contentType.charAt(0).toUpperCase() + report.contentType.slice(1)}:
                      {' '}
                      <Link 
                        to={getContentLink(report)} 
                        className="content-link"
                      >
                        {report.contentTitle || `${report.contentType} #${report.contentId.substring(0,8)}`}
                      </Link>
                    </div>
                  </div>
                  {report.details && (
                    <div className="report-details">
                      {report.details}
                    </div>
                  )}
                  <div className="report-response-section">
                    <textarea
                      className="report-response-input"
                      placeholder="Trả lời báo cáo (nếu có)..."
                      value={responseMessages[report._id] || ''}
                      onChange={(e) => handleResponseMessageChange(report._id, e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="report-actions">
                    <button 
                      className="resolve-btn"
                      onClick={() => handleResolve(report._id)}
                      disabled={resolveMutation.isPending}
                    >
                      {resolveMutation.isPending && resolveMutation.variables?.reportId === report._id
                        ? 'Đang tải...'
                        : 'Đã xử lý'
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportPanel; 