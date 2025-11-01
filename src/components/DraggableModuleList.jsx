import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
// Remove @dnd-kit imports and use custom HTML5 drag-and-drop
import { createUniqueSlug } from '../utils/slugUtils';
import axios from 'axios';
import config from '../config/config';
import cdnConfig from '../config/bunny';

// Re-enable drag-and-drop imports with error handling
// import {
//   useDroppable,
// } from '@dnd-kit/core';
// import {
//   arrayMove,
//   SortableContext,
//   verticalListSortingStrategy,
// } from '@dnd-kit/sortable';
// import {
//   useSortable,
// } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';

// Custom HTML5 drag-and-drop implementation
const ENABLE_CUSTOM_DRAG_AND_DROP = true;

// Custom hook to detect mobile devices with reactive resize detection
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(() => {
    return window.matchMedia && window.matchMedia('(max-width: 576px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 576px)');
    
    const handleChange = (e) => {
      setIsMobile(e.matches);
    };
    
    mediaQuery.addListener(handleChange);
    
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return isMobile;
};

// Helper function to move array items
const arrayMove = (array, fromIndex, toIndex) => {
  const newArray = [...array];
  const element = newArray.splice(fromIndex, 1)[0];
  newArray.splice(toIndex, 0, element);
  return newArray;
};

// Simple cache to avoid fetching the same novel genres multiple times
const genreCache = new Map();

// Batch novel fetching to reduce individual queries
const novelBatchCache = new Map();
const batchRequests = new Map();

// Global cache warming function that can be called from UserProfile
export const warmNovelCache = async (modules) => {
  if (!modules || modules.length === 0) {
    return;
  }
  
  // Extract all novel IDs from modules
  const allNovelIds = modules
    .map(module => {
      // Try multiple possible paths for novel ID
      return module.moduleId?.novelId?._id || 
             module.moduleId?._id || 
             module.novelId?._id || 
             module.novelId ||
             null;
    })
    .filter(id => id);
  
  // Deduplicate the IDs
  const uniqueIds = [...new Set(allNovelIds)];
  
  // Only fetch uncached novels
  const uncachedIds = uniqueIds.filter(id => !genreCache.has(id));
  
  if (uncachedIds.length > 0) {
    try {
      await fetchNovelsBatch(uncachedIds);
    } catch (error) {
      console.error('Error warming cache:', error);
    }
  }
};

const fetchNovelsBatch = async (novelIds) => {
  // Deduplicate input IDs first
  const uniqueIds = [...new Set(novelIds)];
  
  // Filter out already cached novels
  const uncachedIds = uniqueIds.filter(id => !genreCache.has(id));
  
  if (uncachedIds.length === 0) {
    return; // All novels already cached
  }
  
  // Check if there's already a pending batch request for these IDs
  const batchKey = uncachedIds.sort().join(',');
  
  if (batchRequests.has(batchKey)) {
    return batchRequests.get(batchKey);
  }
  
  // Split into chunks of 20 to respect backend limit
  const BATCH_SIZE = 20;
  const chunks = [];
  for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
    chunks.push(uncachedIds.slice(i, i + BATCH_SIZE));
  }
  
  // Create batch request promise
  const batchPromise = (async () => {
    try {
      const allNovels = [];
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const response = await axios.post(`${config.backendUrl}/api/novels/batch`, {
          novelIds: chunk
        });
        
        allNovels.push(...response.data.novels);
      }
      
      // Cache the results
      allNovels.forEach(novel => {
        const type = getNovelType(novel.genres);
        genreCache.set(novel._id, type);
      });
      
      return allNovels;
    } catch (error) {
      console.error('Error fetching novels batch:', error);
      // Cache default types on error to avoid repeated failed requests
      uncachedIds.forEach(id => {
        genreCache.set(id, 'translated');
      });
      throw error;
    } finally {
      // Remove from pending requests
      batchRequests.delete(batchKey);
    }
  })();
  
  // Store the promise to avoid duplicate requests
  batchRequests.set(batchKey, batchPromise);
  
  return batchPromise;
};

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
 * Component to fetch and display novel type banner (optimized with batch fetching)
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

      // Wait progressively longer for pre-fetching to complete before making individual request
      const waitTimes = [50, 100, 200]; // Wait 50ms, then 100ms, then 200ms
      let found = false;
      
      for (const waitTime of waitTimes) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        if (genreCache.has(novelId)) {
          const cachedType = genreCache.get(novelId);
          setNovelType(cachedType);
          setLoading(false);
          found = true;
          break;
        }
      }
      
      if (found) return;

      try {
        // Use batch fetching instead of individual requests
        await fetchNovelsBatch([novelId]);
        
        // Get the cached result
        const type = genreCache.get(novelId) || 'translated';
        setNovelType(type);
      } catch (error) {
        console.error('Error fetching novel genres for', novelId, ':', error);
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
 * Custom draggable module item using HTML5 drag-and-drop
 */
const CustomDraggableModuleItem = ({ 
  moduleData, 
  canManageModules, 
  canRemoveModules, 
  onRemove, 
  dragHandlers, 
  containerType,
  modules = [],
  onMoveUp,
  onMoveDown,
  onMoveToOtherSection
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const itemRef = useRef(null);
  const isCleaningUpRef = useRef(false);
  const isMobile = useMobileDetection();
  
  // Clear drop target state when drag operation ends globally
  useEffect(() => {
    if (!dragHandlers?.draggedItem) {
      isCleaningUpRef.current = true;
      setIsDropTarget(false);
      // Also manually remove the class to ensure it's gone
      if (itemRef.current) {
        itemRef.current.classList.remove('drop-target');
      }
      // Reset cleanup flag after a short delay
      setTimeout(() => {
        isCleaningUpRef.current = false;
      }, 200);
    }
  }, [dragHandlers?.draggedItem]);
  
  // Force cleanup when component updates after successful operations
  useEffect(() => {
    if (!isDropTarget && itemRef.current) {
      itemRef.current.classList.remove('drop-target');
    }
  }, [isDropTarget]);
  
  const handleDragStart = (e) => {
    if (!canManageModules || !dragHandlers) return;
    
    isCleaningUpRef.current = false; // Reset cleanup flag when starting new drag
    setIsDragging(true);
    dragHandlers.onDragStart(e, moduleData.moduleId._id, containerType);
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    setIsDropTarget(false);
    e.currentTarget.style.opacity = '1';
    // Force remove the class
    e.currentTarget.classList.remove('drop-target');
  };

  const handleDragOver = (e) => {
    if (!canManageModules || !dragHandlers || !dragHandlers.draggedItem) return;
    
    // Don't set drop target if we're in cleanup phase
    if (isCleaningUpRef.current) {
      return;
    }
    
    // Only allow drop if we're dragging a different item
    if (dragHandlers.draggedItem.id === moduleData.moduleId._id) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent container from handling this
    setIsDropTarget(true);
  };

  const handleDragLeave = (e) => {
    if (!canManageModules || !dragHandlers) return;
    
    // Only clear if we're actually leaving this item
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e) => {
    if (!canManageModules || !dragHandlers || !dragHandlers.draggedItem) return;
    
    // Don't drop on self
    if (dragHandlers.draggedItem.id === moduleData.moduleId._id) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent container from handling this
    
    // Set cleanup flag immediately
    isCleaningUpRef.current = true;
    
    // Clear drop target state immediately
    setIsDropTarget(false);
    
    // Force remove the class immediately and reset styles
    const element = e.currentTarget;
    element.classList.remove('drop-target');
    // Force style reset
    element.style.border = '2px solid transparent';
    element.style.backgroundColor = 'transparent';
    element.style.transform = 'scale(1)';
    
    // Create a mock event for item-to-item drop (for reordering)
    const mockEvent = {
      active: { id: dragHandlers.draggedItem.id },
      over: { 
        id: moduleData.moduleId._id, // Drop target item ID
        data: { current: { containerId: containerType } }
      },
      draggedFrom: dragHandlers.draggedItem.source,
      draggedTo: containerType,
      dropType: 'item' // Indicate this is an item drop, not container drop
    };
    
    // Call the drop handler
    dragHandlers.onDrop(e, containerType, mockEvent);
    
    // Additional cleanup after the operation
    setTimeout(() => {
      if (itemRef.current) {
        itemRef.current.classList.remove('drop-target');
        // Force style reset again
        itemRef.current.style.border = '2px solid transparent';
        itemRef.current.style.backgroundColor = 'transparent';
        itemRef.current.style.transform = 'scale(1)';
        // Force reflow
        itemRef.current.offsetHeight;
      }
    }, 0);
    
    // Keep cleanup flag active for longer to prevent re-adding the class
    setTimeout(() => {
      isCleaningUpRef.current = false;
      }, 300);
    };

    // Find current index in modules array for mobile actions
    const currentIndex = modules.findIndex(m => m.moduleId._id === moduleData.moduleId._id);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < modules.length - 1;
    const otherSectionType = containerType === 'ongoing' ? 'completed' : 'ongoing';
    const otherSectionLabel = otherSectionType === 'ongoing' ? 'Đang tiến hành' : 'Đã hoàn thành';
  
    // Create the novel detail page URL
  const novelSlug = createUniqueSlug(
    moduleData.moduleId?.novelId?.title || 'novel',
    moduleData.moduleId?.novelId?._id || moduleData.moduleId?.novelId
  );

  // Calculate className with cleanup override
  const getClassName = () => {
    let classes = ['module-item'];
    
    if (isDragging) classes.push('dragging');
    if (canManageModules) classes.push('can-manage');
    
    // Only add drop-target if not in cleanup phase
    const shouldAddDropTarget = isDropTarget && !isCleaningUpRef.current;
    if (shouldAddDropTarget) {
      classes.push('drop-target');
    }
    
    return classes.join(' ');
  };

    return (
      <div
        ref={itemRef}
        className={getClassName()}
        draggable={canManageModules && ENABLE_CUSTOM_DRAG_AND_DROP && !isMobile}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag handle - desktop only */}
        {canManageModules && ENABLE_CUSTOM_DRAG_AND_DROP && !isMobile && (
          <div 
            className="drag-handle"
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

        {/* Mobile action buttons - positioned under remove button */}
        {canManageModules && isMobile && (
          <div className="mobile-action-buttons">
            {canMoveUp && (
              <button 
                className="mobile-action-btn move-up"
                onClick={() => onMoveUp && onMoveUp(moduleData.moduleId._id)}
                title="Di chuyển lên"
                aria-label="Di chuyển lên"
              >
                <i className="fa-solid fa-chevron-up"></i>
              </button>
            )}
            {canMoveDown && (
              <button 
                className="mobile-action-btn move-down"
                onClick={() => onMoveDown && onMoveDown(moduleData.moduleId._id)}
                title="Di chuyển xuống"
                aria-label="Di chuyển xuống"
              >
                <i className="fa-solid fa-chevron-down"></i>
              </button>
            )}
            <button 
              className="mobile-action-btn move-transfer"
              onClick={() => onMoveToOtherSection && onMoveToOtherSection(moduleData.moduleId._id)}
              title={`Chuyển sang ${otherSectionLabel}`}
              aria-label={`Chuyển sang ${otherSectionLabel}`}
            >
              <i className={`fa-solid fa-arrow-${otherSectionType === 'ongoing' ? 'left' : 'right'}`}></i>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

/**
 * Component that safely uses the useSortable hook
 */
const SortableModuleItemWithHooks = ({ moduleData, canManageModules, canRemoveModules, onRemove, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({ id: moduleData.moduleId._id });

  const sortableProps = {
    ref: setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isItemDragging ? 0.5 : 1,
    },
    attributes,
    listeners,
    isDragging: isItemDragging,
  };

  return (
    <SortableModuleItemContent 
      moduleData={moduleData}
      canManageModules={canManageModules}
      canRemoveModules={canRemoveModules}
      onRemove={onRemove}
      isDragging={isDragging}
      sortableProps={sortableProps}
      hasSortableSupport={true}
    />
  );
};

/**
 * Individual draggable module item component content
 */
const SortableModuleItemContent = ({ moduleData, canManageModules, canRemoveModules, onRemove, isDragging, sortableProps, hasSortableSupport }) => {
  // Create the novel detail page URL
  const novelSlug = createUniqueSlug(
    moduleData.moduleId?.novelId?.title || 'novel',
    moduleData.moduleId?.novelId?._id || moduleData.moduleId?.novelId
  );

  return (
    <div
      ref={sortableProps.ref}
      style={sortableProps.style}
      className={`module-item ${sortableProps.isDragging || isDragging ? 'dragging' : ''} ${canManageModules ? 'can-manage' : ''}`}
      {...(sortableProps.attributes || {})}
    >
      {/* Drag handle */}
      {canManageModules && hasSortableSupport && (
        <div 
          className="drag-handle"
          {...(sortableProps.listeners || {})}
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
 * Individual draggable module item component (legacy - now replaced by SafeSortableModuleItem)
 */
const SortableModuleItem = ({ moduleData, canManageModules, canRemoveModules, onRemove, isDragging }) => {
  // Temporarily disabled to fix hook errors
  // const {
  //   attributes,
  //   listeners,
  //   setNodeRef,
  //   transform,
  //   transition,
  //   isDragging: isItemDragging,
  // } = useSortable({ id: moduleData.moduleId._id });

  // const style = {
  //   transform: CSS.Transform.toString(transform),
  //   transition,
  //   opacity: isItemDragging ? 0.5 : 1,
  // };

  // Create the novel detail page URL
  const novelSlug = createUniqueSlug(
    moduleData.moduleId?.novelId?.title || 'novel',
    moduleData.moduleId?.novelId?._id || moduleData.moduleId?.novelId
  );

  // We'll handle novel type detection in a separate component

  return (
    <div
      // ref={setNodeRef}
      // style={style}
      className={`module-item ${isDragging ? 'dragging' : ''} ${canManageModules ? 'can-manage' : ''}`}
      // {...attributes}
    >
      {/* Drag handle */}
      {canManageModules && (
        <div 
          className="drag-handle"
          // {...listeners}
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
 * Safe wrapper for SortableContext that handles hook errors gracefully
 */
const SafeSortableContext = ({ children, items, canManageModules }) => {
  const shouldUseSortableContext = ENABLE_DRAG_AND_DROP && canManageModules;
  
  if (shouldUseSortableContext) {
    return (
      <SortableContext 
        items={items}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    );
  }
  
  // Fallback to fragment if drag-and-drop is disabled
  return <>{children}</>;
};

/**
 * Custom droppable container using HTML5 drag-and-drop
 */
const CustomDroppableContainer = ({ children, containerId, type, canManageModules, dragHandlers }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    if (!canManageModules || !dragHandlers) return;
    
    e.preventDefault();
    setIsOver(true);
    dragHandlers.onDragOver(e, containerId);
  };

  const handleDragLeave = (e) => {
    if (!canManageModules || !dragHandlers) return;
    
    // Only set to false if we're actually leaving the container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOver(false);
      dragHandlers.onDragLeave(e);
    }
  };

  const handleDrop = (e) => {
    if (!canManageModules || !dragHandlers) return;
    
    e.preventDefault();
    setIsOver(false);
    dragHandlers.onDrop(e, containerId);
  };

  return (
    <div
      className={`droppable-container ${isOver && canManageModules ? 'drag-over' : ''}`}
      data-container-id={containerId}
      data-container-type={type}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
};

/**
 * Component that safely uses the useDroppable hook
 */
const DroppableContainerWithHooks = ({ children, containerId, type, canManageModules }) => {
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
      className={`droppable-container ${(isOver && canManageModules) ? 'drag-over' : ''}`}
      data-container-id={containerId}
      data-container-type={type}
    >
      {children}
    </div>
  );
};

/**
 * Droppable container component for cross-section dragging (legacy - now replaced by SafeDroppableContainer)
 */
const DroppableContainer = ({ children, containerId, type, canManageModules }) => {
  // Temporarily disabled to fix hook errors
  // const { setNodeRef, isOver } = useDroppable({
  //   id: containerId,
  //   data: {
  //     type: `${type}-droppable`,
  //     containerId,
  //   },
  // });

  return (
    <div
      // ref={setNodeRef}
      className={`droppable-container ${canManageModules ? 'drag-over' : ''}`}
      data-container-id={containerId}
      data-container-type={type}
    >
      {children}
    </div>
  );
};

/**
 * Custom draggable module list component using HTML5 drag-and-drop
 * 
 * @param {Array} modules - Array of module objects to display
 * @param {boolean} canManageModules - Whether user can drag/reorder modules (pj_user, translator, editor, proofreader, admin, mod)
 * @param {boolean} canRemoveModules - Whether user can remove modules (admin, mod only)
 * @param {Function} onRemove - Callback when removing a module
 * @param {Function} onReorder - Callback when reordering modules
 * @param {string} emptyMessage - Message to show when no modules
 * @param {string} type - Type of list (ongoing/completed)
 * @param {string} containerId - Unique ID for the droppable container
 * @param {Object} dragHandlers - Drag handlers passed from parent
 */
const DraggableModuleList = ({ 
  modules, 
  canManageModules, 
  canRemoveModules = false, // Default to false if not provided
  onRemove, 
  onReorder, 
  emptyMessage,
  type,
  containerId,
  dragHandlers
}) => {
  // Pre-fetch all novel data in batch when modules change
  useEffect(() => {
    if (modules && modules.length > 0) {
      // Try different possible data structures
      const allNovelIds = modules
        .map(module => {
          // Try multiple possible paths for novel ID
          return module.moduleId?.novelId?._id || 
                 module.moduleId?._id || 
                 module.novelId?._id || 
                 module.novelId ||
                 null;
        })
        .filter(id => id);
      
      // Deduplicate the IDs
      const uniqueIds = [...new Set(allNovelIds)];
      
      const novelIds = uniqueIds.filter(id => !genreCache.has(id));
      
      if (novelIds.length > 0) {
        // Pre-fetch novels in batch to avoid individual queries
        fetchNovelsBatch(novelIds).catch(error => {
          console.error('Error pre-fetching novels batch:', error);
        });
      }
    }
  }, [modules]);

  // Add type to each module for display purposes
  const modulesWithType = modules.map(module => ({
    ...module,
    type
  }));

  const content = modules.length === 0 ? (
    <div className={`empty-state ${canManageModules ? 'droppable-empty' : ''}`}>
      <p>{emptyMessage}</p>
      {canManageModules && ENABLE_CUSTOM_DRAG_AND_DROP && (
        <div className="drag-hint">
          <i className="fa-solid fa-arrows-up-down"></i>
          <span>Kéo thả tập vào đây</span>
        </div>
      )}
    </div>
    ) : (
      <div className={`novels-grid ${canManageModules ? 'can-manage' : ''}`}>
        {modulesWithType.map((moduleData) => (
          <CustomDraggableModuleItem
            key={moduleData.moduleId._id}
            moduleData={moduleData}
            canManageModules={canManageModules}
            canRemoveModules={canRemoveModules}
            onRemove={onRemove}
            dragHandlers={dragHandlers}
            containerType={type}
            modules={modulesWithType}
            onMoveUp={(moduleId) => {
              const currentIndex = modulesWithType.findIndex(m => m.moduleId._id === moduleId);
              if (currentIndex > 0) {
                const newOrder = arrayMove(modulesWithType, currentIndex, currentIndex - 1);
                onReorder && onReorder(newOrder);
              }
            }}
            onMoveDown={(moduleId) => {
              const currentIndex = modulesWithType.findIndex(m => m.moduleId._id === moduleId);
              if (currentIndex < modulesWithType.length - 1) {
                const newOrder = arrayMove(modulesWithType, currentIndex, currentIndex + 1);
                onReorder && onReorder(newOrder);
              }
            }}
            onMoveToOtherSection={(moduleId) => {
              // This callback will be handled by the parent UserProfile component
              // For now, we'll emit a custom event
              const event = new CustomEvent('moduleTransfer', {
                detail: { moduleId, from: type, to: type === 'ongoing' ? 'completed' : 'ongoing' }
              });
              window.dispatchEvent(event);
            }}
          />
        ))}
      </div>
    );

  return (
    <CustomDroppableContainer 
      containerId={containerId}
      type={type}
      canManageModules={canManageModules}
      dragHandlers={dragHandlers}
    >
      {content}
    </CustomDroppableContainer>
  );
};

export default DraggableModuleList; 