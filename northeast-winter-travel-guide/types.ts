export interface LocationItem {
  name: string;      // 显示名称，如 "索菲亚大教堂"
  keyword: string;   // 高德搜索关键词，如 "哈尔滨圣索菲亚大教堂"
}

export interface TravelItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  content: string; // 列表页显示的简短内容
  detailContent?: string; // 详情页显示的详细内容（如果没有则显示 content）
  locationKeyword?: string; // 单地点时使用（向下兼容）
  locations?: LocationItem[]; // 多地点时使用
  tags?: string[];
  imageUrl?: string;
  type: 'alert' | 'itinerary' | 'hotel' | 'food' | 'activity' | 'tips';
}

export interface TravelSection {
  id: string;
  title: string;
  description: string;
  items: TravelItem[];
}

export interface TravelData {
  heroImage: string;
  sections: Record<string, TravelSection>;
  lastUpdated?: number; // 新增：用于版本冲突检测的时间戳
}

export type TabId = 'prep' | 'harbin' | 'qiqihar' | 'tips';