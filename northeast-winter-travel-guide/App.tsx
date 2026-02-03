import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_DATA } from './constants';
import { TabId, TravelItem, TravelData } from './types';
import { EditableCard } from './components/EditableCard';
import { Plane, Snowflake, MapPin, Heart, Printer, Share2, X, Globe, AlertCircle, Cloud, RefreshCw, Save, Plus, Camera, WifiOff, Loader2, Info, Settings, Database } from 'lucide-react';
import { supabase, updateSupabaseConfig, resetSupabaseConfig, getCurrentConfig } from './supabaseClient';

const LS_KEY_DATA = 'travel_plan_data';
const LS_KEY_ID = 'travel_plan_id';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('prep');
  
  // 1. 本地缓存读取
  const [data, setData] = useState<TravelData>(() => {
    try {
      const cached = localStorage.getItem(LS_KEY_DATA);
      return cached ? JSON.parse(cached) : INITIAL_DATA;
    } catch (e) {
      return INITIAL_DATA;
    }
  });
  
  const [planId, setPlanId] = useState<number | string | null>(() => {
     return localStorage.getItem(LS_KEY_ID) || null;
  });

  const [showPrintHint, setShowPrintHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // Config Form State
  const [configUrl, setConfigUrl] = useState(getCurrentConfig().url);
  const [configKey, setConfigKey] = useState(getCurrentConfig().key);

  const heroInputRef = useRef<HTMLInputElement>(null);

  // --- 冲突解决逻辑 ---
  const handleDataMerge = (cloudData: TravelData, localData: TravelData): TravelData => {
    const cloudTime = cloudData.lastUpdated || 0;
    const localTime = localData.lastUpdated || 0;

    if (cloudTime > localTime) {
       console.log(`Cloud (${cloudTime}) > Local (${localTime}). Using Cloud.`);
       return cloudData;
    } else {
       console.log(`Local (${localTime}) >= Cloud (${cloudTime}). Keeping Local.`);
       return localData; 
    }
  };

  // --- 核心逻辑 1: 拉取并同步 ---
  const fetchCloudData = async () => {
    try {
      // 永远寻找 ID 最小的那个
      const { data: rows, error: fetchError } = await supabase
        .from('travel_plans')
        .select('id, data')
        .order('id', { ascending: true })
        .limit(1);

      if (fetchError) throw fetchError;

      let targetId: number | string;
      let targetData: TravelData;

      if (rows && rows.length > 0) {
        targetId = rows[0].id;
        targetData = rows[0].data;
      } else {
        console.log('No plan found, initializing...');
        const initData = { ...INITIAL_DATA, lastUpdated: Date.now() };
        const { data: newRow, error: insertError } = await supabase
          .from('travel_plans')
          .insert({ data: initData })
          .select()
          .single();
        
        if (insertError) throw insertError;
        targetId = newRow.id;
        targetData = newRow.data;
      }

      // 兼容性
      if (targetData && !targetData.sections) {
         targetData = { heroImage: INITIAL_DATA.heroImage, sections: targetData as any, lastUpdated: 0 };
      }

      setPlanId(targetId);
      localStorage.setItem(LS_KEY_ID, String(targetId));

      // --- 关键：冲突检测 ---
      setData(currentLocalData => {
         const mergedData = handleDataMerge(targetData, currentLocalData);
         const localTime = currentLocalData.lastUpdated || 0;
         const cloudTime = targetData.lastUpdated || 0;
         
         if (localTime > cloudTime) {
             console.log("Detected unsynced local changes, attempting to push...");
             setTimeout(() => saveData(currentLocalData), 500);
         } else {
             localStorage.setItem(LS_KEY_DATA, JSON.stringify(mergedData));
         }
         return mergedData;
      });

      setSyncStatus('synced');
      setErrorMessage(null);
      setErrorDetail(null);

    } catch (error: any) {
      console.error('Fetch error:', error);
      setSyncStatus('error');
      
      const msg = error.message || '未知错误';
      let friendlyMsg = '连接云端失败';
      
      if (msg.includes('fetch')) friendlyMsg = '网络连接异常';
      if (msg.includes('JWT') || msg.includes('apikey') || msg.code === 'PGRST301') friendlyMsg = 'API Key 权限验证失败';
      if (msg.includes('relation') || msg.code === '42P01') friendlyMsg = '数据库表不存在';
      
      setErrorMessage(`${friendlyMsg} (离线模式)`);
      setErrorDetail(JSON.stringify(error, null, 2));
    } finally {
        setIsFirstLoad(false);
    }
  };

  // --- 初始化 & 轮询 ---
  useEffect(() => {
    fetchCloudData();
    const intervalId = setInterval(() => {
        if (syncStatus === 'synced' || syncStatus === 'idle') {
            fetchCloudData();
        }
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- Realtime ---
  useEffect(() => {
    if (!planId) return;
    const channel = supabase
      .channel(`room_${planId}`)
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'travel_plans', 
          filter: `id=eq.${planId}` 
      }, (payload) => {
        if (payload.new && (payload.new as any).data) {
          const newData = (payload.new as any).data;
          const finalData = !newData.sections ? { ...INITIAL_DATA, sections: newData } : newData;
          
          setData(currentLocal => {
              const merged = handleDataMerge(finalData, currentLocal);
              localStorage.setItem(LS_KEY_DATA, JSON.stringify(merged));
              return merged;
          });
          setSyncStatus('synced');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [planId]);

  // --- 保存数据 (修复：如果没有 ID，自动创建) ---
  const saveData = async (newData: TravelData) => {
    const dataWithTimestamp = { ...newData, lastUpdated: Date.now() };
    
    // 乐观更新
    setData(dataWithTimestamp);
    localStorage.setItem(LS_KEY_DATA, JSON.stringify(dataWithTimestamp));
    setSyncStatus('saving');
    setErrorMessage(null);

    try {
      let targetId = planId;

      // 如果当前没有 ID (说明之前的 fetch 失败了，或者初始化没成功)
      if (!targetId) {
          console.log('No Plan ID found during save, attempting to create new plan...');
          const { data: newRow, error: insertError } = await supabase
              .from('travel_plans')
              .insert({ data: dataWithTimestamp })
              .select()
              .single();
          
          if (insertError) throw insertError;
          
          targetId = newRow.id;
          setPlanId(newRow.id);
          localStorage.setItem(LS_KEY_ID, String(newRow.id));
      } else {
          // 正常更新
          const { error } = await supabase
            .from('travel_plans')
            .update({ data: dataWithTimestamp })
            .eq('id', targetId);

          if (error) throw error;
      }
      
      setSyncStatus('synced');
    } catch (error: any) {
      console.error('Save failed:', error);
      setSyncStatus('error');
      setErrorMessage('保存失败 (请检查配置)');
      setErrorDetail(error.message || 'Unknown error');
    }
  };

  const handleUpdateItem = (sectionId: string, itemId: string, updatedFields: Partial<TravelItem>) => {
    const newData = { ...data };
    const section = newData.sections[sectionId];
    if (section) {
      section.items = section.items.map(item => 
        item.id === itemId ? { ...item, ...updatedFields } : item
      );
    }
    saveData(newData);
  };

  const handleAddItem = (sectionId: string) => {
    const newData = { ...data };
    const section = newData.sections[sectionId];
    if (section) {
        section.items.push({
            id: `new-${Date.now()}`,
            title: '新行程',
            content: '点击编辑添加详细内容...',
            type: 'itinerary',
            time: '待定',
            tags: ['新增']
        });
    }
    saveData(newData);
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
      const newData = { ...data };
      const section = newData.sections[sectionId];
      if (section) {
          section.items = section.items.filter(item => item.id !== itemId);
      }
      saveData(newData);
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        saveData({ ...data, heroImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    setShowPrintHint(true);
    setTimeout(() => { window.print(); setShowPrintHint(false); }, 500);
  };

  const handleSaveConfig = () => {
      updateSupabaseConfig(configUrl, configKey);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'prep', label: '行前准备', icon: <Plane className="w-3.5 h-3.5" /> },
    { id: 'harbin', label: '哈尔滨', icon: <Snowflake className="w-3.5 h-3.5" /> },
    { id: 'qiqihar', label: '齐齐哈尔', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'tips', label: '实用指南', icon: <Heart className="w-3.5 h-3.5" /> },
  ];

  const currentSection = data.sections[activeTab];

  if (isFirstLoad && !data) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ice-500" />
            <p className="text-sm font-medium">正在寻找你们的专属行程...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      
      {errorMessage && (
        <div className="bg-red-500 text-white text-sm py-2 px-4 text-center font-bold sticky top-0 z-[100] shadow-md flex items-center justify-between animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span>{errorMessage}</span>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowConfigModal(true)} className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 flex items-center gap-1">
                    <Settings className="w-3 h-3" /> 配置
                </button>
                <button onClick={() => setShowErrorDetail(!showErrorDetail)} className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30">
                    <Info className="w-3 h-3" />
                </button>
            </div>
        </div>
      )}
      
      {showErrorDetail && errorDetail && (
          <div className="bg-red-50 p-4 border-b border-red-100 text-xs font-mono text-red-800 break-all">
              <p className="font-bold mb-1">错误详情:</p>
              {errorDetail}
          </div>
      )}

      {/* Hero Header */}
      <header className="relative h-[40vh] md:h-[45vh] flex items-center justify-center overflow-hidden bg-slate-900 text-white transition-all duration-300 group">
        <div className="absolute inset-0 z-0">
          <img 
            src={data.heroImage} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-50"></div>
        </div>

        <input 
            type="file" 
            ref={heroInputRef}
            onChange={handleHeroImageUpload}
            className="hidden" 
            accept="image/*"
        />
        <button 
            onClick={() => heroInputRef.current?.click()}
            className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
            title="更换封面图"
        >
            <Camera className="w-5 h-5" />
        </button>
        
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs">
           {syncStatus === 'saving' && <><RefreshCw className="w-3 h-3 animate-spin" /> <span>同步中...</span></>}
           {syncStatus === 'synced' && <><Cloud className="w-3 h-3 text-green-400" /> <span>已同步</span></>}
           {syncStatus === 'error' && <><AlertCircle className="w-3 h-3 text-red-400" /> <span>未同步</span></>}
           {syncStatus === 'idle' && <><Cloud className="w-3 h-3 text-slate-300" /> <span>在线</span></>}
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-0 md:mt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider mb-4 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-ice-400"></span>
            2026 CNY GUIDE
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-3 drop-shadow-xl tracking-tight">
            东北冰雪深度游
          </h1>
          <p className="text-sm md:text-lg text-ice-100 font-light max-w-xl mx-auto leading-relaxed opacity-90">
            哈尔滨 · 齐齐哈尔<br/>
            <span className="text-xs opacity-80">双人实时协同版</span>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 -mt-8 md:-mt-16 relative z-20">
        
        <nav className="flex justify-start md:justify-center mb-6 no-print overflow-x-auto py-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <div className="bg-white/95 backdrop-blur-xl p-1 rounded-full shadow-lg border border-slate-100 flex gap-1 min-w-max mx-auto md:mx-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 shrink-0 ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="mb-6 px-2 no-print">
            <h2 className="text-xl font-bold text-slate-800 border-l-4 border-ice-500 pl-3">{currentSection.title}</h2>
            <p className="text-slate-500 text-sm mt-1 pl-4">{currentSection.description}</p>
        </div>

        <div className="grid gap-4 mb-12 print:block">
          <div className="print:hidden space-y-4">
            {currentSection.items.map(item => (
              <EditableCard 
                key={item.id} 
                item={item} 
                onUpdate={(itemId, fields) => handleUpdateItem(activeTab, itemId, fields)}
                onDelete={(itemId) => handleDeleteItem(activeTab, itemId)}
              />
            ))}
            
            <button 
                onClick={() => handleAddItem(activeTab)}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-ice-400 hover:text-ice-500 hover:bg-ice-50 transition-all flex items-center justify-center gap-2 group"
            >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">添加新行程</span>
            </button>
          </div>

          <div className="hidden print:block space-y-8">
             {tabs.map(tab => {
               const section = data.sections[tab.id];
               return (
                 <div key={tab.id} className="page-break mb-8">
                    <div className="border-b border-slate-300 pb-2 mb-4 mt-4">
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-ice-600 font-mono text-sm bg-ice-50 px-2 py-0.5 rounded">
                          {tab.id === 'prep' ? '01' : tab.id === 'harbin' ? '02' : tab.id === 'qiqihar' ? '03' : '04'}
                        </span>
                        {section.title}
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {section.items.map(item => (
                        <EditableCard 
                          key={`print-${item.id}`} 
                          item={item} 
                          onUpdate={() => {}} 
                          onDelete={() => {}}
                        />
                      ))}
                    </div>
                 </div>
               )
             })}
          </div>
        </div>

        <div className="fixed bottom-6 right-6 flex flex-col gap-3 no-print z-40">
           <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center justify-center w-12 h-12 bg-white text-slate-600 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all hover:scale-105"
            title="如何分享"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-ice-600 transition-all hover:scale-105"
            title="生成PDF / 打印"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>

        {/* Config Modal */}
        {showConfigModal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 no-print">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfigModal(false)}></div>
             <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <button onClick={() => setShowConfigModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-ice-600" />
                    云端连接配置
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    如果你看到红色报错，请检查下方的 URL 和 Key 是否与 Supabase 后台一致。
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Project URL</label>
                        <input type="text" value={configUrl} onChange={e => setConfigUrl(e.target.value)} className="w-full text-sm border border-slate-300 rounded px-3 py-2" placeholder="https://xxx.supabase.co" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Anon Public Key (eyJ...)</label>
                        <input type="text" value={configKey} onChange={e => setConfigKey(e.target.value)} className="w-full text-sm border border-slate-300 rounded px-3 py-2 font-mono" placeholder="eyJ..." />
                    </div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={resetSupabaseConfig} className="flex-1 py-2 text-slate-500 text-sm hover:bg-slate-50 rounded">恢复默认</button>
                    <button onClick={handleSaveConfig} className="flex-1 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800">保存并连接</button>
                </div>
             </div>
           </div>
        )}

        {showPrintHint && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-lg shadow-2xl z-50 no-print backdrop-blur-sm">
                <p className="text-center font-medium">正在生成打印视图...<br/><span className="text-sm text-gray-300">推荐在打印设置中选择"横向"或"缩放"以适应纸张</span></p>
            </div>
        )}

        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 no-print">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-ice-600" />
                双人云端协同模式
              </h3>
              
              <div className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                   <h4 className="font-bold text-green-800 flex items-center gap-2 mb-2">
                    <Save className="w-4 h-4" />
                    已启用实时保存
                  </h4>
                  <p className="text-sm text-green-700">
                    你的所有修改都会自动保存到云端。如果你和她同时打开这个网页，修改会实时同步。
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    连接状态
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Sync Status:</span>
                        <span className={`font-bold ${syncStatus === 'synced' ? 'text-green-600' : 'text-red-500'}`}>
                            {syncStatus === 'synced' ? '正常 (Connected)' : '异常 (Error)'}
                        </span>
                    </div>
                    {syncStatus === 'error' && (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                            {errorMessage || '无法连接到数据库，请检查下方的配置。'}
                        </div>
                    )}
                    <button 
                        onClick={() => { setShowShareModal(false); setShowConfigModal(true); }}
                        className="w-full mt-2 py-2 border border-slate-300 rounded text-slate-600 text-sm hover:bg-white hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        检查/修改连接配置
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full mt-6 bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg"
              >
                Let's Go!
              </button>
            </div>
          </div>
        )}

      </main>
      
      <footer className="text-center py-8 text-slate-400 text-xs no-print">
        <p>2026 Winter Trip Guide · 实时协同版</p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);