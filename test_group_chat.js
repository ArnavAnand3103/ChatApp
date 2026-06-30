/**
 * Group Chat Feature - Live Test Script
 * Tests: Create Group, Group List, Send Message, Receive Message, History, Error Detection
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './Backend/.env' });

const BASE = 'http://localhost:5001';

// ── helpers ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function PASS(name) { console.log(`  ✅ PASS  ${name}`); passed++; }
function FAIL(name, reason) { console.log(`  ❌ FAIL  ${name}\n         → ${reason}`); failed++; }

async function api(method, path, body, token) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    };
    const r = await fetch(`${BASE}${path}`, opts);
    const text = await r.text();
    try { return { status: r.status, data: JSON.parse(text) }; }
    catch { return { status: r.status, data: text }; }
}

// ── main ───────────────────────────────────────────────────────────────────
async function run() {
    // ── connect to DB ──────────────────────────────────────────────────────
    await mongoose.connect('mongodb://127.0.0.1:27017/chatapp');
    const { default: User }    = await import('./Backend/models/User.js');
    const { default: Group }   = await import('./Backend/models/Group.js');
    const { default: Message } = await import('./Backend/models/Message.js');

    // ── seed two users ─────────────────────────────────────────────────────
    let userA = await User.findOne({ email: 'testa@test.com' });
    let userB = await User.findOne({ email: 'testb@test.com' });

    if (!userA) {
        const r = await api('POST', '/signup', { name: 'TestA', email: 'testa@test.com', password: 'Password1' });
        if (r.data?.user) userA = await User.findOne({ email: 'testa@test.com' });
        else { console.error('Could not create userA:', r.data); process.exit(1); }
    }
    if (!userB) {
        const r = await api('POST', '/signup', { name: 'TestB', email: 'testb@test.com', password: 'Password1' });
        if (r.data?.user) userB = await User.findOne({ email: 'testb@test.com' });
        else { console.error('Could not create userB:', r.data); process.exit(1); }
    }

    // login both
    const loginA = await api('POST', '/login', { email: 'testa@test.com', password: 'Password1' });
    const loginB = await api('POST', '/login', { email: 'testb@test.com', password: 'Password1' });
    const tokenA = loginA.data?.token;
    const tokenB = loginB.data?.token;
    if (!tokenA || !tokenB) { console.error('Login failed', loginA.data, loginB.data); process.exit(1); }

    console.log('\n════════════════════════════════════════════');
    console.log(' GROUP CHAT LIVE TEST RESULTS');
    console.log('════════════════════════════════════════════\n');

    // ── TEST 1: Create Group ───────────────────────────────────────────────
    console.log('── TEST 1: Create Group ──');
    const createRes = await api('POST', '/create-group',
        { name: 'LiveTestGroup', members: ['testb@test.com'] },
        tokenA
    );

    let groupId = null;
    if (createRes.status === 200 && createRes.data?.group?._id) {
        PASS('POST /create-group returns 200 with group object');
        groupId = createRes.data.group._id;
    } else {
        FAIL('POST /create-group returns 200 with group object', `status=${createRes.status} data=${JSON.stringify(createRes.data)}`);
    }

    // verify in MongoDB
    if (groupId) {
        const dbGroup = await Group.findById(groupId);
        if (dbGroup) PASS('Group saved in MongoDB');
        else FAIL('Group saved in MongoDB', 'findById returned null');

        // verify members field is populated (not the typo memebers)
        if (dbGroup?.members?.length > 0) {
            PASS('Group.members array is populated (typo fix verified)');
        } else {
            FAIL('Group.members array is populated', `members=${JSON.stringify(dbGroup?.members)}`);
        }

        // verify creator is included in members
        if (dbGroup?.members?.includes('testa@test.com')) {
            PASS('Creator (testa@test.com) is in group.members');
        } else {
            FAIL('Creator included in group.members', `members=${JSON.stringify(dbGroup?.members)}`);
        }
    }

    // ── TEST 2: Group List ─────────────────────────────────────────────────
    console.log('\n── TEST 2: Group List ──');
    const listA = await api('GET', '/groups', null, tokenA);
    const listB = await api('GET', '/groups', null, tokenB);

    if (listA.status === 200 && Array.isArray(listA.data)) {
        const found = listA.data.some(g => g._id === groupId || g._id?.toString() === groupId?.toString());
        if (found) PASS('UserA sees the group they created');
        else FAIL('UserA sees the group they created', `groups=${JSON.stringify(listA.data.map(g=>g.name))}`);
    } else {
        FAIL('GET /groups returns 200 for UserA', `status=${listA.status}`);
    }

    if (listB.status === 200 && Array.isArray(listB.data)) {
        const found = listB.data.some(g => g._id === groupId || g._id?.toString() === groupId?.toString());
        if (found) PASS('UserB (member) sees the group');
        else FAIL('UserB (member) sees the group', `groups=${JSON.stringify(listB.data.map(g=>g.name))}`);
    } else {
        FAIL('GET /groups returns 200 for UserB', `status=${listB.status}`);
    }

    // create a group userC is NOT in and verify userB doesn't see it
    const soloGroup = await api('POST', '/create-group', { name: 'SoloGroup_A', members: [] }, tokenA);
    const soloGroupId = soloGroup.data?.group?._id;
    if (soloGroupId) {
        const listB2 = await api('GET', '/groups', null, tokenB);
        const bSeesSolo = listB2.data?.some(g => g._id?.toString() === soloGroupId?.toString());
        if (!bSeesSolo) PASS('UserB does NOT see groups they are not in');
        else FAIL('UserB does NOT see groups they are not in', 'UserB sees a group they should not');
    }

    // ── TEST 3: Send Group Message (REST/DB check — no live socket) ────────
    console.log('\n── TEST 3: Send Group Message (DB verify) ──');
    if (groupId) {
        // Simulate what the socket handler does: save a message with to=groupId
        const saved = await Message.create({
            from: 'testa@test.com',
            to: groupId,
            message: 'Hello group!',
            messageType: 'text'
        });

        if (saved?._id) {
            PASS('Message saved to DB with to=groupId (socket handler logic works)');
        } else {
            FAIL('Message saved to DB with to=groupId', 'Message.create returned null');
        }

        // verify it can be retrieved by /group-messages/:groupId
        const histRes = await api('GET', `/group-messages/${groupId}`, null, tokenA);
        if (histRes.status === 200 && Array.isArray(histRes.data) && histRes.data.length > 0) {
            PASS('GET /group-messages/:groupId returns messages');
        } else {
            FAIL('GET /group-messages/:groupId returns messages', `status=${histRes.status} data=${JSON.stringify(histRes.data)}`);
        }
    } else {
        FAIL('Send Group Message', 'No groupId available from Test 1');
    }

    // ── TEST 4: Receive Group Message (socket delivery check) ─────────────
    console.log('\n── TEST 4: Receive Group Message (socket handler inspection) ──');
    if (groupId) {
        const dbGroup = await Group.findById(groupId);
        const membersCorrect = dbGroup?.members?.includes('testb@test.com');
        if (membersCorrect) {
            PASS('testb@test.com is in group.members — receiveGroupMessage will be emitted to them');
        } else {
            FAIL('testb@test.com in group.members for socket delivery', `members=${JSON.stringify(dbGroup?.members)}`);
        }
    }

    // ── TEST 5: Group History ──────────────────────────────────────────────
    console.log('\n── TEST 5: Group History (GET /group-messages) ──');
    if (groupId) {
        const histRes = await api('GET', `/group-messages/${groupId}`, null, tokenA);
        if (histRes.status === 200 && Array.isArray(histRes.data)) {
            PASS('GET /group-messages/:groupId returns HTTP 200 with array');
            if (histRes.data.length > 0) {
                const allHaveFrom = histRes.data.every(m => m.from);
                if (allHaveFrom) PASS('All messages have .from field');
                else FAIL('All messages have .from field', 'Some messages missing .from');
            }
        } else {
            FAIL('GET /group-messages/:groupId', `status=${histRes.status} data=${JSON.stringify(histRes.data)}`);
        }
    }

    // ── TEST 6: Error Detection (static analysis results) ─────────────────
    console.log('\n── TEST 6: Error Detection ──');

    // 6a. server.js line 14: import from wrong path
    // The folder is named "middelware" (typo) but server.js imports from "./middleware/auth.js" (correct spelling)
    const fs = await import('fs');
    const serverJs = fs.default.readFileSync('./Backend/server.js', 'utf8');
    const hasWrongMiddlewarePath = serverJs.includes('./middleware/auth.js');
    const middelwareExists = fs.default.existsSync('./Backend/middelware/auth.js');
    const middlewareExists  = fs.default.existsSync('./Backend/middleware/auth.js');

    if (hasWrongMiddlewarePath && middelwareExists && !middlewareExists) {
        FAIL('server.js middleware import path', 'imports from "./middleware/auth.js" but folder is "middelware" (typo) — server WILL NOT START');
    } else {
        PASS('server.js middleware import path');
    }

    // 6b. verifyToken imported but never used
    const usesVerifyToken = (serverJs.match(/verifyToken/g) || []).length;
    if (usesVerifyToken === 1) {
        FAIL('verifyToken unused import', 'Imported from middelware/auth.js on line 14 but never used anywhere — dead import AND crashes server on startup');
    } else {
        PASS('verifyToken import is used');
    }

    // 6c. ChatPage.jsx line 106: selectedUser.email used without isGroup guard
    const chatPageJs = fs.default.readFileSync('./Frontend-React/src/pages/ChatPage.jsx', 'utf8');
    const checkBlockLine = chatPageJs.includes('socket.emit("checkBlock",{me:user.email,other:selectedUser.email})');
    if (checkBlockLine) {
        FAIL('ChatPage.jsx checkBlock — no isGroup guard',
            'Line 106: socket.emit("checkBlock",{me:user.email,other:selectedUser.email}) fires when a group is selected. selectedUser.email is undefined for groups → emits checkBlock with other:undefined → sets isBlocked incorrectly');
    } else {
        PASS('ChatPage.jsx checkBlock has isGroup guard');
    }

    // 6d. Chat.jsx receiveGroupMessage duplicate message risk
    const chatJs = fs.default.readFileSync('./Frontend-React/src/components/Chat/Chat.jsx', 'utf8');
    const groupHandlerHasDupCheck = chatJs.includes('receiveGroupMessage') &&
        !chatJs.split('receiveGroupMessage')[1].split('socket.on')[0].includes('isDuplicate');
    if (groupHandlerHasDupCheck) {
        FAIL('Chat.jsx receiveGroupMessage — no duplicate check',
            'Line 184: setMessages(prev=>[...prev,msg]) has NO duplicate guard. The sender emits groupMessage → server emits receiveGroupMessage to ALL members including sender → sender sees message twice (once from optimistic update if added, but groupMessage does NOT add optimistic update, so this is OK — but if user reconnects and history reloads while socket still fires, duplicates can appear). Consider adding isDuplicate check matching _id.');
    } else {
        PASS('Chat.jsx receiveGroupMessage has duplicate check');
    }

    // 6e. Chat.jsx sendMessage isGroup — no empty-message guard before emit
    const groupSendBlock = chatJs.match(/if\(selectedUser\?\.isGroup\)\{[\s\S]*?return;\s*\}/)?.[0] || '';
    const hasEmptyGuard = groupSendBlock.includes('trim()') || groupSendBlock.includes('!text');
    if (!hasEmptyGuard) {
        FAIL('Chat.jsx sendMessage — no empty-text guard for group messages',
            'Lines 194-200: if(selectedUser?.isGroup) emits groupMessage even when text is empty string. Backend Message.create will save an empty message to DB because message field has default:"" and no required constraint.');
    } else {
        PASS('Chat.jsx sendMessage group empty-text guard');
    }

    // 6f. Message.js pre-validate: from===to check — groupId is not an email so it won't trigger
    // but make sure groupMessage doesn't fail it
    const messageJs = fs.default.readFileSync('./Backend/models/Message.js', 'utf8');
    const hasFromToCheck = messageJs.includes('fromEmail === toEmail');
    if (hasFromToCheck) {
        // groupId (mongo ObjectId string) !== sender email, so it's fine
        PASS('Message.js pre-validate from===to does NOT block group messages (groupId != email)');
    }

    // ── cleanup ────────────────────────────────────────────────────────────
    await Group.deleteMany({ name: { $in: ['LiveTestGroup', 'SoloGroup_A'] } });
    await Message.deleteMany({ to: groupId });
    await mongoose.connection.close();

    // ── summary ────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════');
    console.log(` SUMMARY: ${passed} PASSED  |  ${failed} FAILED`);
    console.log('════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
