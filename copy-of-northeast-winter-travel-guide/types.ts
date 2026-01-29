export interface TravelItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  content: string;
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

export type TabId = 'prep' | 'harbin' | 'qiqihar' | 'tips';