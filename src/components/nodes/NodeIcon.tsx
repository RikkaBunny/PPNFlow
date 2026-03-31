/**
 * Renders a Lucide icon by name.
 */
import {
  Camera,
  Sparkles,
  MousePointer2,
  Move,
  Keyboard,
  Type,
  FileText,
  Image,
  Braces,
  Search,
  GitBranch,
  Clock,
  FileCode,
  Download,
  Upload,
  ArrowRightLeft,
  Eye,
  Box,
  Globe,
  Terminal,
  Plus,
  Scissors,
  Hash,
  Dices,
  ArrowUpDown,
  GripHorizontal,
  Calculator,
  Scale,
  Crop,
  Maximize2,
  ScanSearch,
  ScanText,
  Pipette,
  LayoutList,
  ScrollText,
  RotateCw,
  FileInput,
  FileOutput,
  AppWindow,
  type LucideProps,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Camera, Sparkles, MousePointer2, Move, Keyboard, Type,
  FileText, Image, Braces, Search, GitBranch, Clock,
  FileCode, Download, Upload, ArrowRightLeft, Eye, Box,
  Globe, Terminal, Plus, Scissors, Hash, Dices,
  ArrowUpDown, GripHorizontal, Calculator, Scale,
  Crop, Maximize2, ScanSearch, ScanText, Pipette,
  LayoutList, ScrollText, RotateCw, FileInput, FileOutput,
  AppWindow,
  // Aliases
  Replace: ArrowRightLeft,
};

interface Props {
  name: string;
  size?: number;
  color?: string;
}

export function NodeIcon({ name, size = 18, color = "currentColor" }: Props) {
  const Icon = ICONS[name] ?? ICONS.Box;
  return <Icon size={size} color={color} />;
}
