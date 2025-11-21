import { RoutingMap } from "./routing.types";

export interface FeatureResult<T = unknown> {
  success: boolean;
  details?: string;
  payload?: T;
}

export interface InstallTemplatesResult extends FeatureResult {
  templateCount?: number;
}

export interface SyncTemplatesResult extends FeatureResult {
  updatedFiles?: string[];
}

export interface GeneratePathDocsResult extends FeatureResult<RoutingMap> {
  routes?: string[];
}

export interface ValidateStructureResult extends FeatureResult {
  missing?: string[];
}

export interface StatusResult extends FeatureResult {
  drifted?: string[];
}

export interface ResetResult extends FeatureResult {
  resetFiles?: string[];
}
