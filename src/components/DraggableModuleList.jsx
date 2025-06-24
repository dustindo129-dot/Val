import React from 'react';
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

/**
 * Individual draggable module item component
 */
const SortableModuleItem = ({ moduleData, canManageModules, onRemove, isDragging }) => {
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
      
      <img 
        src={moduleData.moduleId?.illustration || moduleData.moduleId?.novelId?.illustration} 
        alt={moduleData.moduleId?.title} 
        className="module-cover" 
        onError={(e) => {
          e.target.src = 'https://Valvrareteam.b-cdn.net/defaults/missing-image.png';
        }}
      />
      <div className="module-info">
        <h4 className="module-title">
          {moduleData.moduleId?.novelId?.title} - {moduleData.moduleId?.title}
        </h4>
        <div className="module-meta">
          {moduleData.moduleId?.mode === 'paid' && (
            <span>🌾 {moduleData.moduleId?.moduleBalance}</span>
          )}
          <span>
            {moduleData.type === 'completed' ? 'Hoàn thành' : 'Thêm vào'}: {new Date(moduleData.addedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {canManageModules && (
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
 */
const DraggableModuleList = ({ 
  modules, 
  canManageModules, 
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