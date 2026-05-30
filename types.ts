
export interface User {
  email: string;
  name: string;
  role: 'admin' | 'user';
  areaBase?: string;
}

export interface QualityDocument {
  id: string;
  title: string;
  type: 'pdf' | 'docx';
  status: 'published' | 'pending' | 'signed' | 'approved' | 'rejected';
  uploader: string;
  uploadDate: string;
  area?: string;
  expirationDate?: string;
  url?: string;
  fileData?: string;
  uploaderEmail?: string;
  uploaderName?: string;
  uploaderArea?: string;
  note?: string;
}

export interface MuralPost {
  id: string;
  title: string;
  content: string;
  date: string;
  image?: string;
}

export interface CampaignSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}
