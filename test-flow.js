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
            headers: {
                'Content-Type': 'application/json',
            }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
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

async function runTest() {
    console.log('--- Starting Backend Verification ---');
    
    const ts = Date.now();
    const email = `testuser_${ts}@example.com`;
    const password = 'Password123';

    // 1. Register User
    console.log('\n[1] Registering user...');
    let res = await request('/auth/register', 'POST', {
        firstName: 'Test',
        lastName: 'User',
        email,
        password
    });
    console.log('Status:', res.status);
    if (res.status !== 201) throw new Error('Registration failed');
    const token = res.data.token;
    console.log('User ID:', res.data._id);
    console.log('JWT Token Received: YES');

    // 2. Add Transactions
    console.log('\n[2] Adding transactions...');
    const tx1 = await request('/transactions', 'POST', {
        type: 'income',
        amount: 5000,
        merchant: 'Tech Corp Salary',
        date: new Date().toISOString()
    }, token);
    console.log('Added Income 5000:', tx1.status);

    const tx2 = await request('/transactions', 'POST', {
        type: 'expense',
        amount: 1500,
        merchant: 'Downtown Apartments',
        date: new Date().toISOString()
    }, token);
    console.log('Added Expense 1500:', tx2.status);

    const tx3 = await request('/transactions', 'POST', {
        type: 'expense',
        amount: 200,
        merchant: 'Whole Foods',
        date: new Date().toISOString()
    }, token);
    console.log('Added Expense 200:', tx3.status);

    // 3. Check Analytics
    console.log('\n[3] Fetching Dashboard Analytics...');
    const analytics = await request('/transactions/analytics', 'GET', null, token);
    console.log('Status:', analytics.status);
    if (analytics.status !== 200) {
        console.error('Analytics Error:', analytics.data);
    } else {
        const d = analytics.data;
        console.log(`Total Income: ${d.totalIncome}`);
        console.log(`Total Expenses: ${d.totalExpenses}`);
        console.log(`Total Balance: ${d.totalBalance}`);
        console.log(`Health Score: ${d.healthScore}`);
        console.log(`Category Breakdown count: ${d.categoryBreakdown.length}`);
    }

    console.log('\n--- Verification Complete ---');
}

runTest().catch(console.error);
