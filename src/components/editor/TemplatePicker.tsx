/**
 * Template picker overlay — shows example workflows to load.
 */
import { X, ArrowRight } from "lucide-react";
import { TEMPLATES, type TemplateInfo } from "@/lib/templates";
import { NodeIcon } from "@/components/nodes/NodeIcon";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (template: TemplateInfo) => void;
}

export function TemplatePicker({ open, onClose, onLoad }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="overlay-backdrop" onClick={onClose} />
      <div
        className="relative z-10 rounded-2xl w-[680px] max-h-[80vh] flex flex-col animate-scale-in"
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text)" }}>
              Templates
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Load an example workflow to get started
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-pink-50"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onLoad(t); onClose(); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl text-left
                         transition-all group border"
              style={{
                borderColor: "var(--color-border-light)",
                background: "var(--color-panel)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.color + "60";
                e.currentTarget.style.background = t.color + "06";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-light)";
                e.currentTarget.style.background = "var(--color-panel)";
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: t.color + "12" }}
              >
                <NodeIcon name={t.icon} size={20} color={t.color} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
                  {t.name}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {t.description}
                </div>
                {/* Node count + mode */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ color: t.color, background: t.color + "12" }}
                  >
                    {t.workflow.nodes.length} nodes
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: "var(--color-text-muted)", background: "var(--color-canvas)" }}
                  >
                    {t.workflow.settings.run_mode === "loop" ? "Loop mode" : "Run once"}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight
                size={16}
                className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                style={{ color: t.color }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
