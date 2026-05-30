export interface Item {
  id: string;
  label: string;
  checked: boolean;
}

export interface Category {
  id: string;
  icon: string;
  name: string;
  items: Item[];
}

export interface AIAdviceCategory {
  name: string;
  icon: string;
  items: string[];
}

export interface AIAdviceResult {
  advice: string;
  categories: AIAdviceCategory[];
}

export interface HistoryEntry {
  id: string;
  situation: string;
  advice: string;
  created_at: string;
}
