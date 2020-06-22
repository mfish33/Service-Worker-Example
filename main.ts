import express from 'express'
import path from 'path'

const app: express.Application = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './serviceWorker/index.html'))
});

app.use('/', express.static(path.join(__dirname, './serviceWorker/dist')));
app.use('/apps', express.static(path.join(__dirname, './apps')))

app.listen(8080, () => {
    console.log('App is listening on port 8080!');
});