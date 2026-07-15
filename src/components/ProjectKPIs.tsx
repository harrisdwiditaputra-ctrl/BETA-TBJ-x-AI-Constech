import React from 'react';
import { ProjectMetrics } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, DollarSign, Target, Activity, AlertTriangle, Clock, Users, Zap, CheckCircle2 } from 'lucide-react';

interface ProjectKPIsProps {
  metrics: ProjectMetrics;
}

export const ProjectKPIs: React.FC<ProjectKPIsProps> = ({ metrics }) => {
  const kpiData = [
    { label: "SPI", value: metrics.spi.toFixed(2), icon: TrendingUp, color: "text-blue-500" },
    { label: "CPI (%)", value: `${metrics.cpi.toFixed(0)}%`, icon: DollarSign, color: "text-green-500" },
    { label: "Budget Var", value: `Rp ${metrics.budgetVariance.toLocaleString()}`, icon: Target, color: "text-orange-500" },
    { label: "Completion (%)", value: `${metrics.completionPercentage.toFixed(0)}%`, icon: Activity, color: "text-purple-500" },
    { label: "Labor Prod", value: metrics.laborProductivity.toFixed(2), icon: Users, color: "text-teal-500" },
    { label: "Mat Wastage (%)", value: `${metrics.materialWastage.toFixed(1)}%`, icon: AlertTriangle, color: "text-red-500" },
    { label: "Rework (%)", value: `${metrics.reworkPercentage.toFixed(1)}%`, icon: Zap, color: "text-yellow-500" },
    { label: "LTIFR", value: metrics.ltifr.toFixed(2), icon: AlertTriangle, color: "text-red-600" },
    { label: "Defect Rate (%)", value: `${metrics.qualityDefectRate.toFixed(1)}%`, icon: CheckCircle2, color: "text-indigo-500" },
    { label: "Equip Util (%)", value: `${metrics.equipmentUtilizationRate.toFixed(0)}%`, icon: Activity, color: "text-cyan-500" },
    { label: "Mat On-Time (%)", value: `${metrics.materialDeliveryOnTime.toFixed(0)}%`, icon: Clock, color: "text-emerald-500" },
    { label: "Change Order Freq", value: metrics.changeOrderFrequency.toFixed(0), icon: TrendingUp, color: "text-pink-500" },
    { label: "Cashflow Perf", value: metrics.cashflowPerformance.toFixed(2), icon: DollarSign, color: "text-emerald-700" },
    { label: "Client Satisf.", value: metrics.clientSatisfactionScore.toFixed(1), icon: Users, color: "text-amber-500" },
    { label: "RFI Resp. Time", value: `${metrics.rfiResponseTime.toFixed(1)}h`, icon: Clock, color: "text-sky-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="shadow-sm border-none rounded-2xl bg-white/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{kpi.label}</CardTitle>
            <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black tracking-tight">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
