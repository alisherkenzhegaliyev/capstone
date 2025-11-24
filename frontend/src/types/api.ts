export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  category: string; // "qr_code", "stamp", etc.
  confidence: number;
  bbox: BBox;
}

export interface PageResult {
  page_index: number;
  page_size: {
    width: number;
    height: number;
  };
  detections: Detection[];
  annotated_image_url: string;
}

export interface AnalyzeResponse {
  job_id: string;
  pages: PageResult[];
}

// X-ray analysis types
export interface PredictionLabel {
  label: string;
  confidence: number;
}

export interface XrayPrediction {
  top_prediction: PredictionLabel;
  all_predictions: PredictionLabel[];
  is_pneumonia: boolean;
  filename: string;
}
