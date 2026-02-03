import React, { useState, useEffect, useRef } from 'react';
import { TravelItem, LocationItem } from '../types';
import { Pencil, Save, X, Snowflake, Train, Home, Utensils, Heart, AlertTriangle, Upload, Image as ImageIcon, Trash2, Maximize2, MapPin, Navigation, Plus } from 'lucide-react';

interface EditableCardProps {
  item: TravelItem;
  onUpdate: (id: string, updatedFields: Partial<TravelItem>) => void;
  onDelete: (id: string) => void;
}

export const EditableCard: React.FC<EditableCardProps> = ({ item, onUpdate, onDelete }) => {
  // State for Main Card Editing
  const [isEditing, setIsEditing] = useState(false);

  // State for Detail Modal
  const [showDetail, setShowDetail] = useState(false);
  const [isEditingDetail, setIsEditingDetail] = useState(false);

  // Form States (Shared)
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const [editDetailContent, setEditDetailContent] = useState(item.detailContent || item.content);
  const [editSubtitle, setEditSubtitle] = useState(item.subtitle || '');
  const [editTime, setEditTime] = useState(item.time || '');
  const [editImage, setEditImage] = useState(item.imageUrl || '');
  const [editLocations, setEditLocations] = useState<LocationItem[]>(
    item.locations || (item.locationKeyword ? [{ name: item.title, keyword: item.locationKeyword }] : [])
  );

  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when item prop changes
  useEffect(() => {
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditDetailContent(item.detailContent || item.content);
    setEditSubtitle(item.subtitle || '');
    setEditTime(item.time || '');
    setEditImage(item.imageUrl || '');
    setEditLocations(
      item.locations || (item.locationKeyword ? [{ name: item.title, keyword: item.locationKeyword }] : [])
    );
    setImgError(false);
  }, [item]);

  // When opening edit mode in either place, sync default values
  const syncEditStates = () => {
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditDetailContent(item.detailContent || item.content);
    setEditSubtitle(item.subtitle || '');
    setEditTime(item.time || '');
    setEditImage(item.imageUrl || '');
    setEditLocations(
      item.locations || (item.locationKeyword ? [{ name: item.title, keyword: item.locationKeyword }] : [])
    );
  };

  const handleSave = () => {
    onUpdate(item.id, {
      title: editTitle,
      content: editContent,
      detailContent: editDetailContent,
      subtitle: editSubtitle,
      time: editTime,
      imageUrl: editImage,
      locations: editLocations.length > 0 ? editLocations : undefined,
      locationKeyword: editLocations.length === 1 ? editLocations[0].keyword : undefined
    });
    setIsEditing(false);
    setIsEditingDetail(false);
  };

  const handleCancel = () => {
    syncEditStates();
    setImgError(false);
    setIsEditing(false);
    setIsEditingDetail(false);
  };

  const handleDelete = () => {
      if(window.confirm('确定要删除这个项目吗？')) {
          onDelete(item.id);
      }
  }

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

  // 打开高德地图（使用 window.open 确保在新标签页打开，避免返回问题）
  const openAmap = (keyword: string) => {
    const amapUrl = `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&src=mypage`;
    window.open(amapUrl, '_blank', 'noopener,noreferrer');
  };

  // Location editing functions
  const addLocation = () => {
    setEditLocations([...editLocations, { name: '', keyword: '' }]);
  };

  const updateLocation = (index: number, field: 'name' | 'keyword', value: string) => {
    const newLocations = [...editLocations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setEditLocations(newLocations);
  };

  const removeLocation = (index: number) => {
    setEditLocations(editLocations.filter((_, i) => i !== index));
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

  // 获取有效的地点列表（优先使用 locations，否则用 locationKeyword）
  const effectiveLocations: LocationItem[] = item.locations && item.locations.length > 0
    ? item.locations
    : item.locationKeyword
      ? [{ name: item.locationKeyword, keyword: item.locationKeyword }]
      : [];

  return (
    <>
      <div className="group page-break bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-md relative flex flex-row h-auto min-h-[140px]">

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
          accept="image/*"
        />

        {/* Image Section - Clickable */}
        <div
          className="relative w-32 md:w-40 shrink-0 bg-slate-100 flex items-center justify-center overflow-hidden border-r border-slate-100 cursor-pointer group/img"
          onClick={() => !isEditing && setShowDetail(true)}
        >
          {editImage && !imgError ? (
            <img
              src={editImage}
              alt={item.title}
              className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover/img:scale-110"
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

          {/* Overlay hints */}
          {!isEditing && (
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          )}

          {/* Upload Overlay (Edit Mode) */}
          {isEditing && (
            <div
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
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
          <div className="absolute top-2 right-2 z-20 no-print flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => { syncEditStates(); setIsEditing(true); }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button onClick={handleDelete} className="p-1.5 bg-red-50 text-red-500 border border-red-200 rounded-full hover:bg-red-100 shadow-sm mr-2" title="删除">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleSave} className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm">
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleCancel} className="p-1.5 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 shadow-sm">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

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

          <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  placeholder="列表页显示的简短描述"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 resize-none text-xs"
                />
            ) : (
              <div className="line-clamp-3">{item.content}</div>
            )}
          </div>

          {/* Tags */}
          {!isEditing && item.tags && item.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {item.tags.map((tag: string) => (
                <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded border border-slate-200">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDetail(false)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">

            {/* Modal Header Image */}
            <div className="relative h-48 md:h-64 shrink-0 bg-slate-200">
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {editImage && !imgError ? (
                <img
                  src={editImage}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                   <span className="text-sm">暂无图片</span>
                </div>
              )}

              {isEditingDetail && (
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 bg-white/90 text-slate-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:bg-white"
                 >
                    <Upload className="w-3.5 h-3.5" /> 更换封面
                 </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 bg-white">

              {/* Header Row */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex-1">
                   {isEditingDetail ? (
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-400 uppercase w-12 shrink-0">时间</span>
                             <input
                                type="text"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="text-xs font-bold text-ice-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full"
                              />
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-400 uppercase w-12 shrink-0">标题</span>
                             <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-2xl font-serif font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full"
                              />
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-400 uppercase w-12 shrink-0">副标题</span>
                             <input
                                type="text"
                                value={editSubtitle}
                                onChange={(e) => setEditSubtitle(e.target.value)}
                                className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full"
                              />
                         </div>
                      </div>
                   ) : (
                     <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-ice-50 text-ice-600 rounded text-xs font-bold uppercase tracking-wider">
                            {item.time || '行程安排'}
                          </span>
                          {item.tags?.map((t: string) => (
                            <span key={t} className="text-xs text-slate-400 border border-slate-200 px-1.5 rounded">#{t}</span>
                          ))}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-1">{item.title}</h2>
                        <p className="text-slate-500 font-medium">{item.subtitle}</p>
                     </>
                   )}
                </div>

                {/* Map Actions - Multiple Locations Support */}
                <div className="shrink-0">
                   {isEditingDetail ? (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-slate-600 uppercase">导航地点</label>
                            <button
                              onClick={addLocation}
                              className="text-xs text-ice-600 hover:text-ice-700 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> 添加地点
                            </button>
                          </div>

                          {editLocations.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4">
                              点击"添加地点"来添加导航位置
                            </p>
                          )}

                          <div className="space-y-3">
                            {editLocations.map((loc, index) => (
                              <div key={index} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200">
                                <div className="flex-1 space-y-2">
                                  <input
                                    type="text"
                                    value={loc.name}
                                    onChange={(e) => updateLocation(index, 'name', e.target.value)}
                                    placeholder="显示名称（如：索菲亚大教堂）"
                                    className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                                  />
                                  <input
                                    type="text"
                                    value={loc.keyword}
                                    onChange={(e) => updateLocation(index, 'keyword', e.target.value)}
                                    placeholder="搜索关键词（如：哈尔滨圣索菲亚大教堂）"
                                    className="w-full text-xs border border-slate-200 rounded px-2 py-1 text-slate-500"
                                  />
                                </div>
                                <button
                                  onClick={() => removeLocation(index)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-3">
                            提示：搜索关键词越具体越好，如"冰雪大世界西门"比"冰雪大世界"更精确
                          </p>
                      </div>
                   ) : (
                      effectiveLocations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {effectiveLocations.map((loc, index) => (
                            <button
                              key={index}
                              onClick={() => openAmap(loc.keyword)}
                              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-md shadow-emerald-200 hover:scale-105 transition-transform active:scale-95"
                            >
                              <Navigation className="w-4 h-4" />
                              <span className="font-medium text-sm">{loc.name}</span>
                            </button>
                          ))}
                        </div>
                      )
                   )}
                </div>
              </div>

              {/* Body Text */}
              <div className="prose prose-slate max-w-none">
                {isEditingDetail ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">详细内容 (支持换行)</label>
                    <textarea
                      value={editDetailContent}
                      onChange={(e) => setEditDetailContent(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm leading-relaxed"
                    />
                     <label className="block text-xs font-bold text-slate-400 uppercase mt-4 mb-2">列表页简略内容</label>
                     <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {item.detailContent || item.content}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                 {isEditingDetail ? (
                    <>
                      <button onClick={handleCancel} className="px-5 py-2 rounded-full bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">取消</button>
                      <button onClick={handleSave} className="px-6 py-2 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-lg">保存修改</button>
                    </>
                 ) : (
                    <button
                      onClick={() => { syncEditStates(); setIsEditingDetail(true); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="text-sm font-medium">编辑详情</span>
                    </button>
                 )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
