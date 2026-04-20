import React from "react";
import { TimelineEvent } from "@/types";
import { CheckCircle2, Clock, PlayCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProjectTimelineProps {
  events: TimelineEvent[];
  onUpdateStatus?: (id: string, status: TimelineEvent["status"]) => void;
  isAdmin?: boolean;
}

export default function ProjectTimeline({ events, onUpdateStatus, isAdmin }: ProjectTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-12 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
        <Calendar className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
        <p className="text-[10px] font-black uppercase text-neutral-400">Belum ada timeline proyek.</p>
      </div>
    );
  }

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-neutral-200">
      {sortedEvents.map((event, idx) => (
        <div key={event.id} className="relative flex items-center gap-6 group">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm ring-2 z-10 transition-all",
            event.status === "completed" ? "bg-green-500 ring-green-500" :
            event.status === "ongoing" ? "bg-accent ring-accent animate-pulse" :
            "bg-neutral-200 ring-neutral-200"
          )}>
            {event.status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : event.status === "ongoing" ? (
              <PlayCircle className="h-5 w-5 text-white" />
            ) : (
              <Clock className="h-5 w-5 text-neutral-400" />
            )}
          </div>
          <div className="flex-grow p-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-neutral-50 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-black uppercase tracking-tight text-sm">{event.title}</h3>
                  <Badge variant="outline" className={cn(
                    "text-[8px] uppercase font-bold rounded-md",
                    event.status === "completed" ? "border-green-500 text-green-500 bg-green-50" :
                    event.status === "ongoing" ? "border-accent text-accent bg-accent/5" :
                    "border-neutral-300 text-neutral-400"
                  )}>
                    {event.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono">
                  <p>Start: {new Date(event.date).toLocaleDateString()}</p>
                  {event.dueDate && <p>Estimation: {new Date(event.dueDate).toLocaleDateString()}</p>}
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateStatus?.(event.id, 'ongoing')}
                    className={cn(
                      "p-2 rounded-lg border-2 border-black hover:bg-black hover:text-white transition-colors",
                      event.status === 'ongoing' && "bg-black text-white"
                    )}
                  >
                    <PlayCircle className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdateStatus?.(event.id, 'completed')}
                    className={cn(
                      "p-2 rounded-lg border-2 border-black hover:bg-black hover:text-white transition-colors",
                      event.status === 'completed' && "bg-black text-white"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
