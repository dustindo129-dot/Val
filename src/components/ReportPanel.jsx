import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../styles/ReportPanel.css';

const ReportPanel = ({ user }) => {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);

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
    mutationFn: (reportId) => api.resolveReport(reportId),
    onSuccess: () => {
      // Invalidate reports query to refetch data
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const handleResolve = (reportId) => {
    resolveMutation.mutate(reportId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Function to generate content link based on content type
  const getContentLink = (report) => {
    if (report.contentType === 'chapter' && report.contentId) {
      // If we have a novelId, use it, otherwise use a default route
      if (report.novelId) {
        return `/novel/${report.novelId}/chapter/${report.contentId}`;
      } else {
        // If no novelId, we may need to fetch it or just provide a limited link
        return `/chapters/${report.contentId}`;
      }
    } else if (report.contentType === 'novel' && report.contentId) {
      return `/novel/${report.contentId}`;
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
            <div className="report-loading">Đang tải báo cáo...</div>
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
                      {report.reporter?.username || 'Anonymous'}
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
                  <div className="report-actions">
                    <button 
                      className="resolve-btn"
                      onClick={() => handleResolve(report._id)}
                      disabled={resolveMutation.isPending}
                    >
                      {resolveMutation.isPending && resolveMutation.variables === report._id
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