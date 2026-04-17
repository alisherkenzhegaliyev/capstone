import type { CHDInput, CHDPrediction } from "./chd";
import type { ReadmissionInput, ReadmissionPrediction } from "./readmission";
import type { XrayPrediction } from "./types";

export type HistoryEntry =
  | {
      id: string;
      createdAt: string;
      feature: "xray";
      prediction: XrayPrediction;
    }
  | {
      id: string;
      createdAt: string;
      feature: "chd";
      input: CHDInput;
      result: CHDPrediction;
    }
  | {
      id: string;
      createdAt: string;
      feature: "readmission";
      input: ReadmissionInput;
      result: ReadmissionPrediction;
    };

export type HistoryNavigationState = {
  selectedEntry?: HistoryEntry;
};
