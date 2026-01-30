import React, { useState, useEffect, useRef } from 'react';
import { TravelItem } from '../types';
import { Pencil, Save, X, Snowflake, Train, Home, Utensils, Heart, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react';

interface EditableCardProps {
  item: TravelItem;
  onUpdate: (id: string, updatedFields: Partial<TravelItem>) => void;
}

export const EditableCard: React.FC<EditableCardProps> = ({ item, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const [editSubtitle, setEditSubtitle] = useState(item.subtitle || '');
  const [editTime, setEditTime] = useState(item.time || '');
  const [editImage, setEditImage] = useState(item.imageUrl || '');
  
  // 新增：图片加载错误状态
  const [imgError, setImgError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditSubtitle(item.subtitle || '');
    setEditTime(item.time || '');
    setEditImage(item.imageUrl || '');
    setImgError(false); // 重置错误状态
  }, [item]);

  // 当图片地址改变时，重置错误状态
  useEffect(() => {
    setImgError(false);
  }, [editImage]);

  const handleSave = () => {
    onUpdate(item.id, {
      title: editTitle,
      content: editContent,
      subtitle: editSubtitle,
      time: editTime,
      imageUrl: editImage,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditSubtitle(item.subtitle || '');
    setEditTime(item.time || '');
    setEditImage(item.imageUrl || '');
    setImgError(false);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
        setImgError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'hotel': return <Home className="w-4 h-4 text-indigo-500" />;
      case 'food': return <Utensils className="w-4 h-4 text-orange-500" />;
      case 'activity': return <Snowflake className="w-4 h-4 text-ice-500" />;
      case 'tips': return <Heart className="w-4 h-4 text-pink-500" />;
      default: return <Train className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="group page-break bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md relative flex flex-row h-auto min-h-[140px]">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden" 
        accept="image/*"
      />

      {/* Image Section - Fixed Width for compactness */}
      <div className="relative w-32 md:w-40 shrink-0 bg-slate-100 flex items-center justify-center overflow-hidden border-r border-slate-100">
        {editImage && !imgError ? (
          <img 
            src={editImage} 
            alt={item.title} 
            className="w-full h-full object-cover absolute inset-0"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
            <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
            <span className="text-[10px]">
                {imgError ? '加载失败' : '暂无图片'}
            </span>
          </div>
        )}
        
        {/* Upload Overlay (Only in Edit Mode) */}
        {isEditing && (
          <div 
            className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center text-white">
              <Upload className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">更换图片</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        {/* Edit Buttons - Absolute top right of content area */}
        <div className="absolute top-2 right-2 z-20 no-print flex gap-2">
           {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button onClick={handleSave} className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCancel} className="p-1.5 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 shadow-sm">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Header Line */}
        <div className="flex items-center gap-2 mb-1.5">
          {getIcon()}
          {isEditing ? (
            <input
              type="text"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              placeholder="时间"
              className="text-xs font-bold text-ice-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 w-32"
            />
          ) : (
             item.time && <span className="text-xs font-bold text-ice-600 tracking-wide uppercase truncate">{item.time}</span>
          )}
        </div>

        {/* Title & Subtitle */}
        <div className="mb-2">
          {isEditing ? (
            <div className="space-y-2">
               <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-serif font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
              />
              <input
                type="text"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="副标题/地点"
                className="w-full text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
              />
            </div>
          ) : (
            <>
              <h3 className="text-lg font-serif font-bold text-slate-800 leading-tight">
                {item.title}
              </h3>
              {item.subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                  {item.subtitle}
                </p>
              )}
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
           {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 resize-none text-xs"
              />
           ) : (
             item.content
           )}
        </div>

        {/* Tags */}
        {!isEditing && item.tags && item.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {item.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded border border-slate-200">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};