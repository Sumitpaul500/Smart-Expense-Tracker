const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function seed() {
    const email = `demo${Date.now()}@finpilot.ai`;
    const password = 'Password123!';
    
    console.log('Registering:', email);
    const res = await request('/auth/register', 'POST', {
        firstName: 'Demo', lastName: 'User', email, password
    });
    
    if (res.status !== 201) throw new Error('Failed to register: ' + JSON.stringify(res.data));
    const token = res.data.token;
    
    // Add realistic transactions
    await request('/transactions', 'POST', { type: 'income', amount: 8500, merchant: 'Salary', date: new Date().toISOString() }, token);
    await request('/transactions', 'POST', { type: 'expense', amount: 2400, merchant: 'Rent', date: new Date().toISOString() }, token);
    await request('/transactions', 'POST', { type: 'expense', amount: 120, merchant: 'Netflix', date: new Date().toISOString() }, token);
    await request('/transactions', 'POST', { type: 'expense', amount: 450, merchant: 'Groceries', date: new Date().toISOString() }, token);
    await request('/transactions', 'POST', { type: 'expense', amount: 80, merchant: 'Uber', date: new Date().toISOString() }, token);
    
    console.log('Seeded successfully!');
    console.log(`USE EMAIL: ${email}`);
    console.log(`USE PASSWORD: ${password}`);
}

seed().catch(console.error);
