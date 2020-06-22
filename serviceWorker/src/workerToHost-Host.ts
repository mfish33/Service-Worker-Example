import PromiseWorkerType from 'promise-worker'
import { workerHostFuncCall, HostFuncRes, Status } from './sharedTypes'

export default class WorkerToHost {

    private serviceWorker: PromiseWorkerType
    private funcRegistry = {}

    constructor() {
        this.funcRegistry = {}
    }

    public registerFunc(func: Function, name?: string) {
        const funcName = name ? name : func.name
        if (this.funcRegistry[funcName]) {
            throw 'Naming Conflict in register Function'
        }
        this.funcRegistry[funcName] = func
    }

    public registerServiceWorker(serviceWorker: PromiseWorkerType): void {
        if (this.serviceWorker) {
            throw 'Service Worker Already Registered'
        }
        this.serviceWorker = serviceWorker
        serviceWorker.postMessage(
            {
                header: 'WorkerToHost',
                body: {
                    status: Status.init
                }
            } as HostFuncRes
        ).then((message) => this.handleResponse(message))
    }

    private handleResponse(res: workerHostFuncCall): void {
        if (res.body.func == '__echo__init') {
            return
        }
        let possibleFunc = this.funcRegistry[res.body.func]
        if (possibleFunc) {
            try {
                Promise.resolve(possibleFunc(...res.body.args)).then(ret => this.reHook(Status.success, ret))
            } catch (e) {
                this.reHook(Status.error, e)
            }
        } else {
            this.reHook(Status.error, 'Function is not currently Registered')
        }
    }

    private reHook(status: Status, returnVal: string) {
        this.serviceWorker.postMessage(
            {
                header: 'WorkerToHost',
                body: {
                    status: status,
                    return: returnVal
                }
            } as HostFuncRes
        ).then((message) => this.handleResponse(message))
    }
}