/**
 * Renders a Lucide icon by name. Used by GenericNode to display
 * the correct icon for each node type.
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
  type LucideProps,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
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
};

interface Props {
  name: string;
  size?: number;
  color?: string;
}

export function NodeIcon({ name, size = 18, color = "white" }: Props) {
  const Icon = ICONS[name] ?? ICONS.Box;
  return <Icon size={size} color={color} />;
}
