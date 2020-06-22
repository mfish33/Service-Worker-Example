import { apps, App } from './appConfig'
import * as JSZip from 'jszip'
import { crossThreadMessage } from './sharedTypes'
import WorkerToHost from './workerToHost-Worker'
const registerPromiseWorker = require('promise-worker/register')
const mime = require('mime');
var zip = new JSZip();
const appIds = apps.map(app => app.id)
const workerToHost = new WorkerToHost()

const version = "0.1";
const cacheName = `testApp-${version}`;

// For Install
self.addEventListener('install', function (event: any) {
    // Incomplete typescript worker global scope
    let g = self as any
    event.waitUntil(caches.open(cacheName).then(cache => cache.add('/')).then(() => g.skipWaiting()))
});

self.addEventListener('activate', (event: any) => {
    let g = self as any
    event.waitUntil(g.clients.claim());
});

self.addEventListener('enqueue', () => { })

registerPromiseWorker((message: crossThreadMessage): crossThreadMessage | Promise<crossThreadMessage> => {
    if (message.header == 'WorkerToHost') {
        return workerToHost.onMessage(message)
    }
    return {
        header: 'Unhandeled message',
        body: ''
    }
})

self.addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(proxy(event))
})

const proxy = async (event: FetchEvent) => {
    let cache = await caches.open(cacheName)
    let params = event.request.url.replace(/http:\/\/||https:\/\//, '').split('/')
    let [, qAppId] = params
    for (let id of appIds) {
        if (qAppId == id) {
            let req = params.slice(1, params.length).join('/')
            let cachedRes = await cache.match(req)
            if (cachedRes) {
                return cachedRes
            }
            let app = apps.filter(a => a.id == params[1])[0]
            await cacheApp(app, cache)
            cachedRes = await cache.match(req)
            // Returns empty response if not found
            return cachedRes ? cachedRes : new Response()
        }
    }
    // If file not found in cache try the original request in the cache and if not then let the request through to the internet
    // The reason for this is to allow the caching of routes manually like on the install event above
    // There is a weird chrome bug that sometimes errors fetches to localhost through the service worker. Want to investigate further because firefox does not have this issue
    return cache.match(event.request).then((res) => res || fetch(event.request))
}


const cacheApp = async (app: App, cache: Cache): Promise<void> => {
    try {
        let data = await fetch(`./${app.zipLoc}${app.id}.zip`).then(res => res.arrayBuffer())
        let content = await zip.loadAsync(data)
        // Written this way to allow multiple caching operations asynchronously
        let cacheFiles: Promise<void>[] = []
        for (let key in content.files) {
            let file = content.files[key]
            if (!file.dir) {
                cacheFiles.push(
                    responseMaker(file)
                        .then(res => cache.put(file.name, res))
                        .catch(console.error)
                )
            }
        }
        await Promise.all(cacheFiles)
    } catch (e) {
        throw e
    }

}

// Gets mime types in order for browser to load the file correctly
const responseMaker = async (file: JSZip.JSZipObject): Promise<Response> => {
    let end = file.name.match(/\.\w+$/)
    // If no extension is given assume that it is type text/plain
    let ext = end ? end.pop() : '.txt'
    if (!ext) {
        throw `File extension could not be found: ${file.name}`
    }
    let data = await file.async('blob')
    let res = new Response(data)
    res.headers.set('Content-Type', mime.getType(ext))
    return res
}


setInterval(() => {
    console.log('ATTEMPTING TO CALL FUNCTION')
    workerToHost.callHostFunc('test', []).then((val) => console.log('Received:', val))
}, 5000)