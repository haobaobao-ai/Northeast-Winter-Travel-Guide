export interface TravelItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  content: string; // 列表页显示的简短内容
  detailContent?: string; // 详情页显示的详细内容（如果没有则显示 content）
  locationKeyword?: string; // 用于高德地图搜索的关键词（如果没有则用 title）
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
}

export type TabId = 'prep' | 'harbin' | 'qiqihar' | 'tips';