import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_DATA } from './constants';
import { TabId, TravelItem, TravelData } from './types';
import { EditableCard } from './components/EditableCard';
import { Plane, Snowflake, MapPin, Heart, Printer, Share2, X, Globe, AlertCircle, Cloud, RefreshCw, Save, Plus, Camera, WifiOff } from 'lucide-react';
import { supabase, PLAN_ID } from './supabaseClient';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('prep');
  const [data, setData] = useState<TravelData>(INITIAL_DATA);
  const [showPrintHint, setShowPrintHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const heroInputRef = useRef<HTMLInputElement>(null);

  // 初始化加载
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSyncStatus('saving'); // 显示加载状态
        const { data: remoteData, error } = await supabase
          .from('travel_plans')
          .select('data')
          .eq('id', PLAN_ID)
          .maybeSingle();

        if (error) throw error;

        if (remoteData && remoteData.data) {
          console.log('Remote data found:', remoteData.data);
          
          // --- 核心：数据结构自动升级逻辑 ---
          // 检查是否是旧数据（没有 sections 字段，或者是旧的数组结构）
          if (!remoteData.data.sections) {
             console.log('Migrating old data structure to new format...');
             // 假定旧数据就是 sections 对象本身（旧版本逻辑）
             const migratedData: TravelData = {
                heroImage: INITIAL_DATA.heroImage,
                sections: remoteData.data as any 
             };
             // 立即保存升级后的结构，修复数据库
             saveData(migratedData); 
          } else {
             // 数据结构正常，直接使用
             setData(remoteData.data);
             setSyncStatus('synced');
          }
        } else {
          // 如果数据库里完全没有 ID=1 的数据，尝试初始化
          // 注意：如果 RLS 禁止 Insert，这步会失败，但会抛出 error 被 catch 捕获显示出来
          console.log('No data found, attempting to initialize...');
          const { error: insertError } = await supabase
            .from('travel_plans')
            .upsert({ id: PLAN_ID, data: INITIAL_DATA });
          
          if (insertError) throw insertError;
          setSyncStatus('synced');
        }
      } catch (error: any) {
        console.error('Error fetching/initializing data:', error);
        setSyncStatus('error');
        setErrorMessage(error.message || '连接数据库失败，请检查网络或配置');
      }
    };

    fetchData();

    // 实时监听逻辑
    const subscription = supabase
      .channel(`room:${PLAN_ID}`) // 使用唯一频道名
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'travel_plans', 
          filter: `id=eq.${PLAN_ID}` 
      }, (payload) => {
        if (payload.new && (payload.new as any).data) {
          console.log('Remote change received!', (payload.new as any).data);
          const newData = (payload.new as any).data;
          
          // 接收端也做一次兼容性检查
          if (!newData.sections) {
             setData({ heroImage: INITIAL_DATA.heroImage, sections: newData });
          } else {
             setData(newData);
          }
          // 收到更新，状态设为已同步
          setSyncStatus('synced');
        }
      })
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
             console.log('Realtime connected!');
         }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 通用保存函数
  const saveData = async (newData: TravelData) => {
    // 1. 乐观更新：先改本地，让用户觉得快
    setData(newData);
    setSyncStatus('saving');
    setErrorMessage(null);

    try {
      // 2. 发送到云端
      const { error } = await supabase
        .from('travel_plans')
        .upsert({ id: PLAN_ID, data: newData });

      if (error) throw error;
      
      // 3. 成功
      setSyncStatus('synced');
    } catch (error: any) {
      console.error('Error syncing:', error);
      setSyncStatus('error');
      // 4. 失败时明确告知用户
      setErrorMessage(`保存失败: ${error.message || '权限不足或网络断开'}`);
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

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      
      {/* 错误提示条 - 只有出错时显示 */}
      {errorMessage && (
        <div className="bg-red-500 text-white text-sm py-2 px-4 text-center font-bold sticky top-0 z-[100] flex items-center justify-center gap-2 shadow-md">
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

        {/* Hero Edit Button */}
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
        
        {/* Sync Status Indicator */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs">
           {syncStatus === 'saving' && <><RefreshCw className="w-3 h-3 animate-spin" /> <span>同步中...</span></>}
           {syncStatus === 'synced' && <><Cloud className="w-3 h-3 text-green-400" /> <span>已同步</span></>}
           {syncStatus === 'error' && <><AlertCircle className="w-3 h-3 text-red-400" /> <span>同步失败</span></>}
           {syncStatus === 'idle' && <><Cloud className="w-3 h-3 text-slate-300" /> <span>准备就绪</span></>}
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
            
            {/* Add Item Button */}
            <button 
                onClick={() => handleAddItem(activeTab)}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-ice-400 hover:text-ice-500 hover:bg-ice-50 transition-all flex items-center justify-center gap-2 group"
            >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">添加新行程</span>
            </button>
          </div>

          {/* Print View */}
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

        {/* Floating Actions */}
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

        {/* Print Hint */}
        {showPrintHint && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-lg shadow-2xl z-50 no-print backdrop-blur-sm">
                <p className="text-center font-medium">正在生成打印视图...<br/><span className="text-sm text-gray-300">推荐在打印设置中选择"横向"或"缩放"以适应纸张</span></p>
            </div>
        )}

        {/* Share Modal */}
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