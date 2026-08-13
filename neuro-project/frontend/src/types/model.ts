export type ModelMetrics = {
  balanced_accuracy_cv?: number;
  accuracy_train?: number;
  f1_macro_train?: number;
  confusion_matrix?: number[][];
  classification_report?: string;
};

export type ModelMetadata = {
  model_type: string;
  training_date: string;
  feature_list: string[];
  classes: string[];
  sampling_frequency: number;
  filter_config: {
    highpass_hz: number;
    lowpass_hz: number;
    mains_frequency: number;
  };
  window_duration: number;
  validation_metrics: ModelMetrics;
  all_models?: Record<string, ModelMetrics>;
};

export type ModelsResponse = {
  trained: boolean;
  metadata?: ModelMetadata;
};
