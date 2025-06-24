import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
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
 * Draggable module list component
 */
const DraggableModuleList = ({ 
  modules, 
  canManageModules, 
  onRemove, 
  onReorder, 
  emptyMessage,
  type 
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = modules.findIndex(item => item.moduleId._id === active.id);
      const newIndex = modules.findIndex(item => item.moduleId._id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(modules, oldIndex, newIndex);
        onReorder(newOrder);
      }
    }
  };

  if (modules.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Add type to each module for display purposes
  const modulesWithType = modules.map(module => ({
    ...module,
    type
  }));

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
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
    </DndContext>
  );
};

export default DraggableModuleList; 