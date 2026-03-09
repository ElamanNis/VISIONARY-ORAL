
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer
} from 'recharts';
import { ProjectMetrics } from '../types';
import { 
  Wind, Users, TrendingUp, Car, Briefcase, 
  Accessibility, ShieldCheck, DollarSign, Lightbulb, Info,
  FileText, Image as ImageIcon, AlertTriangle, BarChart3, Calculator
} from 'lucide-react';

interface AnalysisDashboardProps {
  metrics: ProjectMetrics;
  imageUrl: string | null;
  projectName: string;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ metrics, imageUrl, projectName }) => {
  const radarData = [
    { subject: 'Экология', A: metrics.ecoImpact, fullMark: 100 },
    { subject: 'Социум', A: metrics.socialUtility, fullMark: 100 },
    { subject: 'Экономика', A: metrics.economicGrowth, fullMark: 100 },
    { subject: 'Доступность', A: metrics.accessibility, fullMark: 100 },
    { subject: 'Инфрастр.', A: Math.max(0, 100 - metrics.infraLoad), fullMark: 100 },
  ];

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `Visionary_Uralsk_${projectName}_Visualization.png`;
    link.click();
  };

  const handleDownloadReport = () => {
    const reportContent = `
ОФИЦИАЛЬНЫЙ ОТЧЕТ ЭКСПЕРТИЗЫ ПЛАТФОРМЫ "VISIONARY URALSK"
Проект: ${projectName}
Дата формирования: ${new Date().toLocaleString()}
-----------------------------------------------------------

1. ОБЩИЕ ПОКАЗАТЕЛИ (0-100):
- Экологическое влияние: ${metrics.ecoImpact}
- Социальная полезность: ${metrics.socialUtility}
- Экономический рост: ${metrics.economicGrowth}
- Доступность среды: ${metrics.accessibility}
- Нагрузка на инфраструктуру: ${metrics.infraLoad}

2. ЭКОНОМИЧЕСКИЕ ИНДИКАТОРЫ:
${metrics.economicIndicators?.map(ind => `- ${ind.label}: ${ind.value} ${ind.unit}`).join('\n') || 'Нет данных'}

3. РИСКИ И УГРОЗЫ:
- Суммарная оценка рисков: ${metrics.totalRiskSum}
${metrics.risks?.map(risk => `- [${risk.level}%] ${risk.title}: ${risk.impact}`).join('\n') || 'Нет данных'}

4. КЛЮЧЕВЫЕ МЕТРИКИ:
- Потенциал CO2: ${metrics.co2Reduction}
- Новых рабочих мест: ${metrics.jobsCreated}
- Изменение трафика: ${metrics.trafficChange}%
- Окупаемость (ROI): ${metrics.costRoi}

5. ЭКСПЕРТНЫЙ АНАЛИЗ:
${metrics.detailedAnalysis}

6. РЕКОМЕНДАЦИИ:
${metrics.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

-----------------------------------------------------------
Сгенерировано AI-системой Visionary Uralsk (г. Уральск)
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${projectName}.txt`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-wrap gap-3 no-print mb-4">
        <button 
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 ring-1 ring-slate-900/10"
        >
          <FileText size={18} />
          Скачать отчет (.txt)
        </button>
        <button 
          disabled={!imageUrl}
          onClick={handleDownloadImage}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 ring-1 ring-slate-900/5"
        >
          <ImageIcon size={18} />
          Скачать визуализацию
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <TrendingUp className="text-blue-600" size={24} />
              Баланс городских показателей
            </h3>
            <Info size={18} className="text-slate-400 cursor-help" />
          </div>
          <div className="h-80 w-full min-w-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={projectName}
                  dataKey="A"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
            <Lightbulb className="text-amber-500" size={24} />
            Архитектурный концепт (AI)
          </h3>
          <div className="flex-1 bg-gradient-to-br from-slate-50 to-white rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-100 min-h-[340px]">
            {imageUrl ? (
              <img src={imageUrl || undefined} alt="AI Visualization" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-3 py-10">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-md bg-blue-200/40 animate-pulse" />
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent relative z-10"></div>
                </div>
                <span className="font-medium animate-pulse mt-2">Генерация фотореалистичного образа...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Новая секция: Экономические показатели */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-4">
          <BarChart3 className="text-blue-600" size={24} />
          Численные экономические показатели
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.economicIndicators?.map((ind, i) => (
            <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col hover:bg-slate-100 transition-colors">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{ind.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{ind.value}</span>
                <span className="text-sm font-bold text-blue-600">{ind.unit}</span>
              </div>
            </div>
          )) || <p className="text-slate-400 italic">Данные об экономических индикаторах отсутствуют</p>}
        </div>
      </div>

      {/* Новая секция: Риски и Угрозы */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-4">
            <AlertTriangle className="text-rose-500" size={24} />
            Карта рисков и потенциальных угроз
          </h3>
          <div className="space-y-4">
            {metrics.risks?.map((risk, i) => (
              <div key={i} className="flex flex-col gap-2 p-4 bg-rose-50/30 rounded-2xl border border-rose-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{risk.title}</span>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${risk.level > 70 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    Уровень: {risk.level}%
                  </span>
                </div>
                <p className="text-sm text-slate-600">{risk.impact}</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${risk.level > 70 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                    style={{ width: `${risk.level}%` }}
                  />
                </div>
              </div>
            )) || <p className="text-slate-400 italic">Анализ рисков не проводился</p>}
          </div>
        </div>

        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-blue-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-center items-center text-center">
          <div className="p-4 bg-white/10 rounded-full mb-6 text-rose-400">
            <Calculator size={48} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Суммарная оценка рисков</span>
          <span className="text-4xl font-black text-white mb-4">{metrics.totalRiskSum}</span>
          <p className="text-sm text-slate-400 font-medium">
            Общая прогнозируемая нагрузка на бюджет и ресурсы при наступлении критических факторов
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricCard 
          icon={<Wind className="text-emerald-500" />} 
          label="Эко-вклад (CO2)" 
          value={metrics.co2Reduction} 
          subtitle="Снижение выбросов"
        />
        <MetricCard 
          icon={<Briefcase className="text-indigo-500" />} 
          label="Занятость" 
          value={`${metrics.jobsCreated}`} 
          subtitle="Рабочих мест"
        />
        <MetricCard 
          icon={<Car className={metrics.trafficChange > 0 ? "text-rose-500" : "text-emerald-500"} />} 
          label="Трафик" 
          value={`${metrics.trafficChange > 0 ? '+' : ''}${metrics.trafficChange}%`} 
          subtitle="Влияние на заторы"
        />
        <MetricCard 
          icon={<DollarSign className="text-amber-600" />} 
          label="ROI" 
          value={metrics.costRoi} 
          subtitle="Окупаемость"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-4">
            <ShieldCheck className="text-blue-600" />
            Экспертное заключение
          </h4>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
              {metrics.detailedAnalysis}
            </p>
          </div>
          <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <span className="block font-bold text-blue-900 text-sm">Ключевая социальная выгода:</span>
              <p className="text-blue-700 text-sm mt-1">{metrics.benefits}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-4">
            <Users className="text-purple-600" />
            Дорожная карта улучшений
          </h4>
          <div className="space-y-4">
            {metrics.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-extrabold transition-colors group-hover:bg-purple-600 group-hover:text-white">
                  {i + 1}
                </span>
                <p className="text-slate-600 text-sm md:text-base pt-1">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, subtitle }: { icon: React.ReactNode, label: string, value: string, subtitle: string }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:translate-y-[-2px] transition-transform">
    <div className="mb-4 p-3 bg-slate-50 rounded-2xl">{icon}</div>
    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</span>
    <span className="text-2xl font-black text-slate-900 mb-1">{value}</span>
    <span className="text-[10px] text-slate-400 font-medium">{subtitle}</span>
  </div>
);

export default AnalysisDashboard;
