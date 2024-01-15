import { IResponse } from ".";
import { getJson } from "../auth";

export enum TPrinterState {
  UNKNOWN = "UNKNOWN",
  Idle = "IDLE",
  Ready = "READY",
  Busy = "BUSY",
  Printing = "PRINTING",
  Paused = "PAUSED",
  Finished = "FINISHED",
  Stopped = "STOPPED",
  Error = "ERROR",
  Attention = "ATTENTION",
}

export interface IStatus {
  ok: boolean;
  message: string;
}

export interface IStorageStatus {
  path: string;
  read_only: boolean;
  name: string;
  free_space?: number;
}

export interface IPrinterStatus {
  state: TPrinterState;
  status_connect?: IStatus;
  status_printer?: IStatus;
  temp_nozzle?: number;
  target_nozzle?: number;
  temp_bed?: number;
  target_bed?: number;
  axis_x?: number;
  axis_y: number;
  axis_z?: number;
  flow?: number;
  speed?: number;
  fan_hotend?: number;
  fan_print?: number;
}

export interface IJobStatus {
  id: number;
  progress: number;
}

export interface ITransferStatus {
  id: number;
  progress: number;
}

export interface ICameraStatus {
  id: number;
}

export interface IStatus {
  storage: IStorageStatus[];
  printer: IPrinterStatus;
  job?: IJobStatus;
  transfer?: ITransferStatus;
  camera?: ICameraStatus;
}

export type IStatusResponse = IResponse<IStatus>;

export const getPrinterStatus = () => {
  const API_URL = "/api/v1/status";
  return getJson(API_URL) as Promise<IStatusResponse>;
};
