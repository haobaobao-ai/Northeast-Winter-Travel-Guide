import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_DATA } from './constants';
import { TabId, TravelItem, TravelData } from './types';
import { EditableCard } from './components/EditableCard';
import { Plane, Snowflake, MapPin, Heart, Printer, Share2, X, Globe, AlertCircle, Cloud, RefreshCw, Save, Plus, Camera, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const LS_KEY_DATA = 'travel_plan_data';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('prep');
  
  // 1. UI 立即加载本地缓存，保证秒开，但标记为 "maybe stale"
  const [data, setData] = useState<TravelData>(() => {
    const cached = localStorage.getItem(LS_KEY_DATA);
    return cached ? JSON.parse(cached) : INITIAL_DATA;
  });
  
  const [planId, setPlanId] = useState<number | string | null>(null);
  const [showPrintHint, setShowPrintHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 首次加载状态
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  const heroInputRef = useRef<HTMLInputElement>(null);

  // --- 核心逻辑 1: 寻找并锁定“第一个”存档 ---
  const fetchCloudData = async () => {
    try {
      // 永远寻找 ID 最小的那个（创建最早的），作为我们的“公共房间”
      // 这样保证两台设备永远看向同一行数据
      const { data: rows, error: fetchError } = await supabase
        .from('travel_plans')
        .select('id, data')
        .order('id', { ascending: true }) // 取最旧的，保证稳定
        .limit(1);

      if (fetchError) throw fetchError;

      let targetId: number | string;
      let targetData: TravelData;

      if (rows && rows.length > 0) {
        // 找到了公共存档 -> 覆盖本地
        targetId = rows[0].id;
        targetData = rows[0].data;
      } else {
        // 数据库是空的 -> 初始化一个
        console.log('No plan found, initializing shared plan...');
        const { data: newRow, error: insertError } = await supabase
          .from('travel_plans')
          .insert({ data: INITIAL_DATA })
          .select()
          .single();
        
        if (insertError) throw insertError;
        targetId = newRow.id;
        targetData = newRow.data;
      }

      // 数据兼容处理
      if (targetData && !targetData.sections) {
         targetData = { heroImage: INITIAL_DATA.heroImage, sections: targetData as any };
      }

      setPlanId(targetId);
      
      // 只有当云端数据确实不同时才更新，避免光标跳动
      setData(prev => {
          const isSame = JSON.stringify(prev) === JSON.stringify(targetData);
          if (isSame) return prev;
          
          // 更新缓存
          localStorage.setItem(LS_KEY_DATA, JSON.stringify(targetData));
          return targetData;
      });

      setSyncStatus('synced');
      setErrorMessage(null);
      setIsFirstLoad(false);

    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      // 如果是第一次加载就失败，必须告诉用户
      if (isFirstLoad) {
          setErrorMessage('连接云端失败，正在使用离线模式 (数据无法同步)');
      }
      setIsFirstLoad(false);
    }
  };

  // --- 核心逻辑 2: 初始化 + 轮询 (双保险) ---
  useEffect(() => {
    // 1. 立即执行一次
    fetchCloudData();

    // 2. 开启轮询 (每 5 秒拉取一次)
    // 即使 Realtime 挂了，轮询也能保证数据最终一致
    const intervalId = setInterval(() => {
        // 只有在空闲时才拉取，避免打断用户输入
        if (syncStatus === 'synced' || syncStatus === 'idle') {
            fetchCloudData();
        }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // --- 核心逻辑 3: 实时监听 (Realtime) ---
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
          console.log('Realtime update received');
          const newData = (payload.new as any).data;
          
          // 兼容处理
          const finalData = !newData.sections 
            ? { heroImage: INITIAL_DATA.heroImage, sections: newData } 
            : newData;

          setData(finalData);
          localStorage.setItem(LS_KEY_DATA, JSON.stringify(finalData));
          setSyncStatus('synced');
        }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log('Realtime Connected');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId]);

  // --- 核心逻辑 4: 保存数据 ---
  const saveData = async (newData: TravelData) => {
    // 1. 乐观更新 UI
    setData(newData);
    localStorage.setItem(LS_KEY_DATA, JSON.stringify(newData));
    setSyncStatus('saving');
    setErrorMessage(null);

    if (!planId) {
        console.warn('Cannot save: No Plan ID');
        return;
    }

    try {
      // 2. 写入数据库
      const { error } = await supabase
        .from('travel_plans')
        .update({ data: newData })
        .eq('id', planId);

      if (error) throw error;
      
      setSyncStatus('synced');
    } catch (error: any) {
      console.error('Save failed:', error);
      setSyncStatus('error');
      setErrorMessage(`保存失败: ${error.message || '网络连接不稳定'}`);
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
        const newItem: TravelItem = {
            id: `new-${Date.now()}`,
            title: '新行程',
            content: '点击编辑添加详细内容...',
            type: 'itinerary',
            time: '待定',
            tags: ['新增']
        };
        section.items.push(newItem);
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
        const newData = { ...data, heroImage: reader.result as string };
        saveData(newData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    setShowPrintHint(true);
    setTimeout(() => {
        window.print();
        setShowPrintHint(false);
    }, 500);
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
        <div className="bg-red-500 text-white text-sm py-2 px-4 text-center font-bold sticky top-0 z-[100] flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top">
            <WifiOff className="w-4 h-4" />
            {errorMessage}
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
           {syncStatus === 'error' && <><AlertCircle className="w-3 h-3 text-red-400" /> <span>未保存</span></>}
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
                    现在可以实时编辑了！
                  </h4>
                  <p className="text-sm text-green-700">
                    这个版本已经连接了数据库。
                    <br/>
                    1. 你在页面上修改文字/上传图片，会<strong>自动保存</strong>到云端。
                    <br/>
                    2. 她打开链接后，会看到最新的内容。
                    <br/>
                    3. 如果她也在编辑，你的页面会自动刷新看到她的修改。
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    如何发给她 (中国大陆访问)
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="font-bold shrink-0">步骤1:</span>
                      <div>确保你已经在 <code>supabaseClient.ts</code> 中填入了正确的 URL 和 KEY。</div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="font-bold shrink-0">步骤2:</span>
                      <div>
                        将代码上传到 GitHub，然后使用 <strong>Cloudflare Pages</strong> 部署。
                        <br/>
                        <span className="text-xs text-slate-400">Cloudflare Pages 在国内访问速度尚可，且不需要翻墙。不要用 Vercel/Netlify。</span>
                      </div>
                    </div>
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