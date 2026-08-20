import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const triggerClass = "group h-20 min-w-[112px] flex-1 flex-col gap-1.5 rounded-none border-r border-slate-200 px-3 text-xs font-medium leading-tight text-teal-700 shadow-none last:border-r-0 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800";
const iconClass = "h-5 w-5 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200";

export function ExecutiveTabsList({ children, className = "" }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <TabsList className="flex h-20 min-w-max overflow-hidden rounded-lg border border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-950">
        {children}
      </TabsList>
    </div>
  );
}

export function ExecutiveTab({ value, icon: Icon, children }) {
  return (
    <TabsTrigger value={value} className={triggerClass}>
      {Icon && <Icon className={iconClass} />}
      <span className="text-center">{children}</span>
    </TabsTrigger>
  );
}

export function ExecutiveSegmentBar({ items, activeKey, onChange, className = "" }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <div className="flex h-20 min-w-max overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
        {items.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onChange(key)} className={`${triggerClass} flex items-center justify-center ${activeKey === key ? "bg-slate-900 text-white shadow-md dark:bg-slate-800" : ""}`}>{Icon && <Icon className={`${iconClass} ${activeKey === key ? "text-white" : ""}`} />}<span className="text-center">{label}</span></button>)}
      </div>
    </div>
  );
}