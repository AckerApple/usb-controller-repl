/** Files in here must be browser safe */
import { ControllerConfigs, DeviceProductLayout, IDeviceMeta } from "./typings";
export declare function getControlConfigByDevice(configs: ControllerConfigs, device: IDeviceMeta): DeviceProductLayout;
export declare function savedControllerToConfigs(controller: DeviceProductLayout, controlConfigs?: ControllerConfigs): ControllerConfigs;
export declare function isDeviceEventsSame(device: DeviceProductLayout, event0: number[], event1: number[]): boolean;
export declare function eventsMatch(event0: number[], event1: number[]): boolean;
export declare function cleanseDeviceEvent(device: DeviceProductLayout, event: number[]): number[];
export declare function devicesMatch(device: IDeviceMeta, lDevice: IDeviceMeta): boolean;
export declare function isDeviceController(device: IDeviceMeta): boolean;
export declare function getDeviceLabel(device: IDeviceMeta): string;
