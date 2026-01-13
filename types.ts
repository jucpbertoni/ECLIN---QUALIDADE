
export interface User {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface QualityDocument {
  id: string;
  title: string;
  type: 'pdf' | 'docx';
  status: 'published' | 'pending' | 'signed';
  uploader: string;
  uploadDate: string;
  url?: string;
}

export interface CampaignSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}
