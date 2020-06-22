export interface crossThreadMessage {
    header: string
    body: any
}

export interface workerHostFuncCall extends crossThreadMessage {
    body: {
        func: string
        args: any[]
    }
}

export enum Status {
    error = 'error',
    success = 'success',
    init = 'init'
}

export interface HostFuncRes extends crossThreadMessage {
    body: {
        status: Status,
        return: any
    }
}
