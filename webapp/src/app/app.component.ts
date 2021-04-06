import { Component } from '@angular/core'
import { IDeviceMeta } from '../../../shared/typings'
import GameControlEvents from './GameControlEvents'
import mapController from './mapController.function'
import { socketHost, socketPort } from '../../../shared/config.json'
import { devicesMatch, isDeviceController } from '../../../index.shared'
import decodeDeviceMetaState from './decodeControllerButtonStates.function'
import { ack } from 'ack-x/js/ack'

export interface IDeviceMetaState extends IDeviceMeta {
  subscribed: boolean
  lastEvent: any
  map?: any // populated if matched to savedController
  pressed?: string[] // populated if matched to savedController
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'webapp'
  wsUrl = `ws://${socketHost}:${socketPort}`
  connection: WebSocket

  devices: IDeviceMetaState[] = []
  listeners: IDeviceMetaState[] = []
  controllers: IDeviceMeta[] = []
  nonControllers: IDeviceMeta[] = []
  savedControllers: Record<string, any> = {}
  savedController: Record<string, any>

  debug = {
    state: 'initializing',
    messages: 0,
    url: this.wsUrl,
    socket: {},
    lastSubscription: {},
    lastPayload: {},
    lastlLogs: {
      info:{}, error: {}
    }
  }

  constructor() {
    this.log('initializing')

    this.debug.state = 'constructing'
    window.onerror = err => this.error(typeof(err) === 'string' ? new Error(err) : err)

    this.log('making socket connection handshake')

    try {
      this.connect()
      this.debug.state = 'constructed'
      this.log('web socket connected')
    } catch (err) {
      this.error(err, {
        message: 'Could not connect to web sockets',
      })
    }
  }

  connect() {
    this.connection = new WebSocket(this.wsUrl)
    this.connection.onopen = () => {
      // connection.send('Message From Client')
      this.log('web socket handshake successful')
      this.fetchUsbDevices()
      this.fetchSavedControllers()
      this.debug.state = 'socket opened'
    }

    this.connection.onerror = (ev: Event): any => {
      this.error(
        ev,
        {message: `Socket error`},
      )
    }

    this.connection.onmessage = (e) => {
      this.debug.state = 'message-received'
      ++this.debug.messages
      this.debug.lastSubscription = e

      try {
        const data = JSON.parse(e.data)
        this.handleMessage(data)
      } catch (err) {
        this.error(err, 'client message failed');
        (this.debug.socket as any).error = err
      }
    }
  }

  mapController(controller: GameControlEvents) {
    mapController(controller)
  }

  handleMessage(data: SocketMessage) {
    switch (data.type) {
      case 'devices':
        this.devices = data.devices
        this.controllers = this.devices.filter(device => isDeviceController(device))
        this.nonControllers = this.devices.filter(device => !isDeviceController(device))
        this.log('devices', data.devices.length, this.devices.length)
        break;

      case 'savedControllers':
        this.savedControllers = data.controllers
        this.log('savedControllers', data.controllers)
        break;

      case 'listeners':
        this.log({
          message: `new listeners received ${this.listeners.length}`
        })
        this.listeners = data.devices
        this.listeners.forEach(lDevice => {
          this.devices.forEach(device => {
            if (devicesMatch(device, lDevice)) {
              device.subscribed = true
            }
          })
        })
        break

      case 'deviceEvent.change':
        this.log({
          message: `device change event`
        })

        const matchedListener = this.listeners.find(device => devicesMatch(device, data.device))

        if (matchedListener) {
          matchedListener.lastEvent = data.event

          if (this.savedController && devicesMatch(matchedListener, this.savedController.deviceMeta)) {
            matchedListener.pressed = decodeDeviceMetaState(matchedListener)
            matchedListener.map = this.savedController.map
          }
        }

        break

      default:
        this.warn('unknown event type', data.type)
    }
  }

  addTestController() {
    this.controllers.push(testController)
    this.devices.push({
      subscribed: false,
      lastEvent: {},
      ...testController
    })
  }

  fetchSavedControllers() {
    const payload = {
      type: 'getSavedControllers'
    }

    this.connection.send(JSON.stringify(payload))
  }

  fetchUsbDevices() {
    const payload = {
      type: 'refresh'
    }

    this.connection.send(JSON.stringify(payload))
  }

  getSavedControllers() {
    const payload = {
      type: 'getSavedControllers'
    }

    this.connection.send(JSON.stringify(payload))
  }

  listenToDevice(device: IDeviceMetaState) {
    const stringRef = `${device.product} by ${device.manufacturer}`

    this.log({
      message: `attempting to listen to ${stringRef}`
    })

    const payload = {
      type: 'listenToDevice', device
    }

    const deviceMatch = this.listeners.find(xDevice=>devicesMatch(device, xDevice))
    if(deviceMatch){
      payload.type = 'unsubscribeToDevice'
      delete device.subscribed
      delete deviceMatch.subscribed
      this.log({
        message: `Unsubscribed from ${stringRef}`
      })
    }

    const savedControllers =  Object.values(this.savedControllers).reduce((all, current) => [...all,...Object.values(current)], [])
    const savedController = savedControllers.find(xSaved=>devicesMatch(device, xSaved.deviceMeta))

    if (savedController) {
      this.savedController = savedController
    }

    this.debug.lastPayload = payload
    this.log({
      message: `requesting web socket to listen to ${stringRef}`
    })
    this.connection.send(JSON.stringify(payload))

    if (device === testController) {
      this.handleMessage({
        type: 'listeners',
        devices: this.devices,
        controllers: this.controllers,
        event: {message:'test-event'},
        device
      })
    }
  }

  error(error: Event | Error, ...extra) {
    if (typeof error === 'string') {
      error = new Error(error)
    }
    const readable = ack.error(error).toObject()
    this.debug.lastlLogs.error = {...readable, ...error, ...extra.reduce((all, one) => ({...all, ...one}), {})}
    console.error(error, extra)
  }

  warn(...data: any) {
    this.debug.lastlLogs.info = data
    console.warn(data)
  }

  log(...data: any) {
    this.debug.lastlLogs.info = data
    console.log(data)
  }
}

const testController: IDeviceMeta = {
  path: 'test-path',
  interface: -1,
  usage: -1,
  usagePage: -1,
  productId: -1,
  vendorId: -32,
  product: 'test-product',
  manufacturer: 'test-manu',

}

interface SocketMessage {
  type: 'deviceEvent.change' | 'listeners' | 'savedControllers' | 'devices'
  devices: IDeviceMetaState[]
  controllers: IDeviceMeta[]
  event?: any // Event
  device?: IDeviceMeta
}