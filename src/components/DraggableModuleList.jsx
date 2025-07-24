import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createUniqueSlug } from '../utils/slugUtils';
import axios from 'axios';
import config from '../config/config';
import cdnConfig from '../config/bunny';

// Simple cache to avoid fetching the same novel genres multiple times
const genreCache = new Map();

// Helper function to determine novel type based on genres
const getNovelType = (genres) => {
  if (!genres || !Array.isArray(genres)) return 'translated';

  const hasVietnameseNovel = genres.some(genre => 
    typeof genre === 'string' && genre.includes('Vietnamese Novel')
  );
  
  if (hasVietnameseNovel) {
    return 'original';
  } else {
    return 'translated';
  }
};

/**
 * Component to fetch and display novel type banner
 */
const NovelTypeBanner = ({ novelId }) => {
  const [novelType, setNovelType] = useState('translated'); // Default to translated
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNovelGenres = async () => {
      if (!novelId) {
        setLoading(false);
        return;
      }

      // Check cache first
      if (genreCache.has(novelId)) {
        const cachedType = genreCache.get(novelId);
        setNovelType(cachedType);
        setLoading(false);
        return;
      }

      try {
        // Use the dashboard endpoint to get novel data including genres
        const response = await axios.get(`${config.backendUrl}/api/novels/${novelId}/dashboard`);
        
        // Extract genres from the dashboard response
        const genres = response.data.novel?.genres;
        const type = getNovelType(genres);
        
        // Cache the result
        genreCache.set(novelId, type);
        setNovelType(type);
      } catch (error) {
        console.error('Error fetching novel genres:', error);
        // Cache the default type on error to avoid repeated failed requests
        genreCache.set(novelId, 'translated');
        // Keep default 'translated' type on error
      } finally {
        setLoading(false);
      }
    };

    fetchNovelGenres();
  }, [novelId]);

  if (loading) {
    return null; // Don't show banner while loading
  }

  return (
    <div className={`module-type-banner ${novelType}`}>
      {novelType === 'original' ? 'Truyện Sáng Tác' : 'Truyện Dịch'}
    </div>
  );
};

/**
 * Individual draggable module item component
 */
const SortableModuleItem = ({ moduleData, canManageModules, canRemoveModules, onRemove, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({ id: moduleData.moduleId._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isItemDragging ? 0.5 : 1,
  };

  // Create the novel detail page URL
  const novelSlug = createUniqueSlug(
    moduleData.moduleId?.novelId?.title || 'novel',
    moduleData.moduleId?.novelId?._id || moduleData.moduleId?.novelId
  );

  // We'll handle novel type detection in a separate component

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`module-item ${isItemDragging ? 'dragging' : ''} ${canManageModules ? 'can-manage' : ''}`}
      {...attributes}
    >
      {/* Drag handle */}
      {canManageModules && (
        <div 
          className="drag-handle"
          {...listeners}
          title="Kéo để sắp xếp lại"
        >
          <i className="fa-solid fa-grip-vertical"></i>
        </div>
      )}
      
      <div className="module-cover-container">
        <img 
          src={cdnConfig.getIllustrationUrl(moduleData.moduleId?.illustration || moduleData.moduleId?.novelId?.illustration)} 
          alt={moduleData.moduleId?.title} 
          className="module-cover" 
          onError={(e) => {
            e.target.src = cdnConfig.getIllustrationUrl(null);
          }}
        />
      </div>
      <div className="module-info">
        {/* Novel type banner above title */}
        <NovelTypeBanner novelId={moduleData.moduleId?.novelId?._id} />
        <h4 className="module-title">
          <Link 
            to={`/truyen/${novelSlug}`}
            className="module-title-link"
            title={`Xem ${moduleData.moduleId?.novelId?.title} - ${moduleData.moduleId?.title}`}
          >
            {moduleData.moduleId?.novelId?.title} - {moduleData.moduleId?.title}
          </Link>
        </h4>
        <div className="module-meta">
          {moduleData.moduleId?.mode === 'paid' && (
            <span>🌾 {moduleData.moduleId?.moduleBalance}</span>
          )}
          <span>
            {moduleData.type === 'completed' ? 'Hoàn thành' : 'Thêm vào'}: {new Date(moduleData.addedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {canRemoveModules && (
          <button 
            className="remove-module-btn"
            onClick={() => onRemove(moduleData.moduleId._id)}
            title="Xóa khỏi danh sách"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Droppable container component for cross-section dragging
 */
const DroppableContainer = ({ children, containerId, type, canManageModules }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: {
      type: `${type}-droppable`,
      containerId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`droppable-container ${isOver && canManageModules ? 'drag-over' : ''}`}
      data-container-id={containerId}
      data-container-type={type}
    >
      {children}
    </div>
  );
};

/**
 * Draggable module list component
 * 
 * @param {Array} modules - Array of module objects to display
 * @param {boolean} canManageModules - Whether user can drag/reorder modules (pj_user, translator, editor, proofreader, admin, mod)
 * @param {boolean} canRemoveModules - Whether user can remove modules (admin, mod only)
 * @param {Function} onRemove - Callback when removing a module
 * @param {Function} onReorder - Callback when reordering modules
 * @param {string} emptyMessage - Message to show when no modules
 * @param {string} type - Type of list (ongoing/completed)
 * @param {string} containerId - Unique ID for the droppable container
 */
const DraggableModuleList = ({ 
  modules, 
  canManageModules, 
  canRemoveModules = false, // Default to false if not provided
  onRemove, 
  onReorder, 
  emptyMessage,
  type,
  containerId
}) => {


  // Add type to each module for display purposes
  const modulesWithType = modules.map(module => ({
    ...module,
    type
  }));

  const content = modules.length === 0 ? (
    <div className={`empty-state ${canManageModules ? 'droppable-empty' : ''}`}>
      <p>{emptyMessage}</p>
      {canManageModules && (
        <div className="drag-hint">
          <i className="fa-solid fa-arrows-up-down"></i>
          <span>Kéo thả tập vào đây</span>
        </div>
      )}
    </div>
  ) : (
    <SortableContext 
      items={modules.map(item => item.moduleId._id)}
      strategy={verticalListSortingStrategy}
    >
      <div className={`novels-grid ${canManageModules ? 'can-manage' : ''}`}>
        {modulesWithType.map((moduleData) => (
          <SortableModuleItem
            key={moduleData.moduleId._id}
            moduleData={moduleData}
            canManageModules={canManageModules}
            canRemoveModules={canRemoveModules}
            onRemove={onRemove}
          />
        ))}
      </div>
    </SortableContext>
  );

  return (
    <DroppableContainer 
      containerId={containerId}
      type={type}
      canManageModules={canManageModules}
    >
      {content}
    </DroppableContainer>
  );
};

export default DraggableModuleList; 