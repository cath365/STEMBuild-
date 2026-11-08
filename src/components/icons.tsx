// STEMBuild line icons: 24 px grid, 1.6 px stroke, round caps. Decorative by default.
type IconProps = { className?: string; title?: string };

function Svg({ className, title, children }: IconProps & { children: React.ReactNode }) {
  return <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>{children}</svg>;
}

export const CalculatorIcon = (p: IconProps) => <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><rect x="8" y="6" width="8" height="3.5" rx=".6" /><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" strokeWidth="2.2" /></Svg>;
export const MultimeterIcon = (p: IconProps) => <Svg {...p}><rect x="5" y="2.5" width="14" height="19" rx="2.5" /><rect x="8" y="5.5" width="8" height="4" rx=".6" /><circle cx="12" cy="15" r="3" /><path d="M12 15l1.6-1.6" /></Svg>;
export const LogicIcon = (p: IconProps) => <Svg {...p}><path d="M8 6h4.5a6 6 0 0 1 0 12H8z" /><path d="M3 9h5M3 15h5M18.5 12H21" /></Svg>;
export const ChipIcon = (p: IconProps) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9.5" y="9.5" width="5" height="5" rx=".5" /><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" /></Svg>;
export const ScopeIcon = (p: IconProps) => <Svg {...p}><rect x="2.5" y="4" width="19" height="16" rx="2" /><path d="M5.5 14.5c1.5 0 1.5-5 3-5s1.5 5 3 5 1.5-5 3-5 1.5 5 3 5" /></Svg>;
export const UsbIcon = (p: IconProps) => <Svg {...p}><path d="M12 3v14M9 5.5 12 3l3 2.5" /><circle cx="12" cy="19" r="2" /><path d="M12 13l-4-2.5V8M12 11l4-2V7" /><rect x="14.8" y="5.6" width="2.4" height="1.8" rx=".3" /><circle cx="8" cy="7.2" r="1" /></Svg>;
export const CubeIcon = (p: IconProps) => <Svg {...p}><path d="M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2z" /><path d="M4 7.2l8 4.4 8-4.4M12 11.6v9.6" /></Svg>;
export const BoxIcon = (p: IconProps) => <Svg {...p}><path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z" /><path d="M3.5 8 12 12l8.5-4M12 12v8" /><path d="m7.8 6 8.5 4" /></Svg>;
export const RouteIcon = (p: IconProps) => <Svg {...p}><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></Svg>;
export const ClipboardIcon = (p: IconProps) => <Svg {...p}><rect x="5" y="4.5" width="14" height="17" rx="2" /><path d="M9 4.5V3.8A.8.8 0 0 1 9.8 3h4.4a.8.8 0 0 1 .8.8v.7" /><path d="m8.5 13 2.2 2.2 4.8-4.7" /></Svg>;
export const ChartIcon = (p: IconProps) => <Svg {...p}><path d="M4 20V4M4 20h16" /><path d="m7.5 15 3.5-4 3 2.5 5-6" /></Svg>;
export const SparkIcon = (p: IconProps) => <Svg {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></Svg>;
export const OfflineIcon = (p: IconProps) => <Svg {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></Svg>;
export const ArrowRightIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
