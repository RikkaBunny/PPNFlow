import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  openaiApiKey: string;
  anthropicApiKey: string;
  pythonPath: string;
  engineAutoStart: boolean;

  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setPythonPath: (path: string) => void;
  setEngineAutoStart: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openaiApiKey: "",
      anthropicApiKey: "",
      pythonPath: "python",
      engineAutoStart: true,

      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setPythonPath: (path) => set({ pythonPath: path }),
      setEngineAutoStart: (v) => set({ engineAutoStart: v }),
    }),
    { name: "ppnflow-settings" }
  )
);
