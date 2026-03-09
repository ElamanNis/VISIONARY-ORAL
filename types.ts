
export enum ProjectType {
  RESIDENTIAL = 'Жилой дом',
  PARK = 'Парк / Сквер',
  OFFICE = 'Офисный центр',
  COMMERCIAL = 'Торговый центр',
  SOCIAL = 'Социальный объект',
  INFRASTRUCTURE = 'Инфраструктура',
  EDUCATION = 'Образовательный центр',
  MEDICAL = 'Медицинский комплекс',
  SPORTS = 'Спортивный объект',
  CULTURAL = 'Культурный хаб',
  RELIGIOUS = 'Религиозный объект',
  INDUSTRIAL = 'Промышленная зона'
}

export enum ProjectScale {
  LOCAL = 'Локальный (двор/улица)',
  DISTRICT = 'Районный',
  CITY = 'Городской',
  REGIONAL = 'Региональный'
}

export enum ArchitecturalStyle {
  MODERN = 'Модерн',
  NEOCLASSIC = 'Неоклассика',
  MINIMALISM = 'Минимализм',
  INDUSTRIAL = 'Индустриальный',
  TRADITIONAL = 'Традиционный'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CITIZEN = 'CITIZEN'
}

export interface User {
  iin: string;
  name: string;
  role: UserRole;
}

export interface ProjectState {
  name: string;
  type: ProjectType;
  scale: ProjectScale;
  description: string;
  dimensions: string;
  style: ArchitecturalStyle;
  location: [number, number] | null;
  base64Image: string | null;
}

export interface RiskItem {
  title: string;
  impact: string;
  level: number; // 0-100
}

export interface EconomicIndicator {
  label: string;
  value: string;
  unit: string;
}

export interface ProjectMetrics {
  ecoImpact: number;
  socialUtility: number;
  economicGrowth: number;
  trafficChange: number;
  co2Reduction: string;
  jobsCreated: number;
  accessibility: number;
  infraLoad: number;
  costRoi: string;
  benefits: string;
  detailedAnalysis: string;
  recommendations: string[];
  risks: RiskItem[];
  totalRiskSum: string;
  economicIndicators: EconomicIndicator[];
}

export interface AnalysisResult {
  metrics: ProjectMetrics;
  generatedImageUrl: string | null;
}

export interface Comment {
  id: string;
  authorName: string;
  authorIin: string;
  text: string;
  timestamp: number;
}

export interface SavedProject {
  id: string;
  timestamp: number;
  creatorIin: string;
  project: ProjectState;
  result: AnalysisResult;
  votesFor: string[]; 
  votesAgainst: string[];
  ratings: Record<string, number>; // userIin -> rating (1-10)
  comments: Comment[];
}
