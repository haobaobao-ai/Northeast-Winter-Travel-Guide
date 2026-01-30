import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_DATA } from './constants';
import { TabId, TravelItem, TravelSection } from './types';
import { EditableCard } from './components/EditableCard';
import { Plane, Snowflake, MapPin, Heart, Printer, Share2, Info, X, Globe, AlertCircle, FileCode, Cloud, RefreshCw, Save } from 'lucide-react';
import { supabase, PLAN_ID } from './supabaseClient';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('prep');
  // 默认使用本地数据，防止白屏，等数据库加载完后会覆盖
  const [data, setData] = useState<Record<string, TravelSection>>(INITIAL_DATA);
  const [showPrintHint, setShowPrintHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(true);

  // 1. 初始化：从 Supabase 获取最新数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: remoteData, error } = await supabase
          .from('travel_plans')
          .select('data')
          .eq('id', PLAN_ID)
          .single();

        if (error) throw error;

        // 如果数据库里是空的（刚建表），就用本地初始数据初始化数据库
        if (remoteData && Object.keys(remoteData.data).length === 0) {
           await supabase
            .from('travel_plans')
            .update({ data: INITIAL_DATA })
            .eq('id', PLAN_ID);
        } else if (remoteData && remoteData.data) {
          setData(remoteData.data);
          setSyncStatus('synced');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setSyncStatus('error');
      }
    };

    fetchData();

    // 2. 实时监听：别人修改了，我也能看到
    const subscription = supabase
      .channel('public:travel_plans')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'travel_plans', filter: `id=eq.${PLAN_ID}` }, (payload) => {
        if (payload.new && payload.new.data) {
          console.log('Remote change received!', payload.new.data);
          setData(payload.new.data);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 更新逻辑：修改本地 state 并推送到 Supabase
  const handleUpdateItem = async (sectionId: string, itemId: string, updatedFields: Partial<TravelItem>) => {
    setSyncStatus('saving');
    
    // 1. Optimistic Update (本地先变，让用户感觉很快)
    const newData = { ...data };
    const section = newData[sectionId];
    if (section) {
      section.items = section.items.map(item => 
        item.id === itemId ? { ...item, ...updatedFields } : item
      );
    }
    setData(newData);

    // 2. 推送到云端
    try {
      const { error } = await supabase
        .from('travel_plans')
        .update({ data: newData })
        .eq('id', PLAN_ID);

      if (error) throw error;
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error syncing:', error);
      setSyncStatus('error');
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
    { id: 'prep', label: '行前准备', icon: <Plane className="w-4 h-4" /> },
    { id: 'harbin', label: '哈尔滨', icon: <Snowflake className="w-4 h-4" /> },
    { id: 'qiqihar', label: '齐齐哈尔', icon: <MapPin className="w-4 h-4" /> },
    { id: 'tips', label: '实用指南', icon: <Heart className="w-4 h-4" /> },
  ];

  const currentSection = data[activeTab];

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Hero Header */}
      <header className="relative h-[35vh] md:h-[45vh] flex items-center justify-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1548236209-408a0d990422?auto=format&fit=crop&w=1920&q=80" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-50"></div>
        </div>
        
        {/* Sync Status Indicator */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs">
           {syncStatus === 'saving' && <><RefreshCw className="w-3 h-3 animate-spin" /> <span>同步中...</span></>}
           {syncStatus === 'synced' && <><Cloud className="w-3 h-3 text-green-400" /> <span>云端已同步</span></>}
           {syncStatus === 'error' && <><AlertCircle className="w-3 h-3 text-red-400" /> <span>同步失败</span></>}
           {syncStatus === 'idle' && <><Cloud className="w-3 h-3 text-slate-300" /> <span>准备就绪</span></>}
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider mb-4 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-ice-400"></span>
            2026 CNY GUIDE
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-3 drop-shadow-xl tracking-tight">
            东北冰雪深度游
          </h1>
          <p className="text-base md:text-lg text-ice-100 font-light max-w-xl mx-auto leading-relaxed opacity-90">
            哈尔滨 · 齐齐哈尔<br/>
            <span className="text-sm">双人实时协同版</span>
          </p>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 -mt-16 relative z-20">
        
        {/* Navigation Tabs - Hidden on Print */}
        <nav className="flex justify-center mb-6 no-print overflow-x-auto py-2 no-scrollbar">
          <div className="bg-white/90 backdrop-blur-xl p-1 rounded-full shadow-lg border border-slate-100 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 shrink-0 ${
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

        {/* Section Header */}
        <div className="mb-6 px-2 no-print">
            <h2 className="text-xl font-bold text-slate-800 border-l-4 border-ice-500 pl-3">{currentSection.title}</h2>
            <p className="text-slate-500 text-sm mt-1 pl-4">{currentSection.description}</p>
        </div>

        {/* Dynamic Content Grid */}
        <div className="grid gap-4 mb-12 print:block">
          {/* Web View */}
          <div className="print:hidden space-y-4">
            {currentSection.items.map(item => (
              <EditableCard 
                key={item.id} 
                item={item} 
                onUpdate={(itemId, fields) => handleUpdateItem(activeTab, itemId, fields)}
              />
            ))}
          </div>

          {/* Print View */}
          <div className="hidden print:block space-y-8">
             {tabs.map(tab => {
               const section = data[tab.id];
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
                        />
                      ))}
                    </div>
                 </div>
               )
             })}
          </div>
        </div>

        {/* Floating Action Buttons */}
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

        {/* Print Hint Toast */}
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