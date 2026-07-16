// 저장: 로그인한 유저의 세이브 데이터(JSON 문자열)를 Netlify Blobs에 저장한다.
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: '로그인이 필요합니다.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청 본문입니다.' }) };
  }

  const { slotId, data } = body;
  if (!slotId || typeof data !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'slotId와 data(문자열)가 필요합니다.' }) };
  }

  // 세이브 데이터 크기 제한 (Netlify Blobs는 큰 값도 지원하지만, 과도한 남용을 막기 위한 안전장치)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (data.length > MAX_SIZE) {
    return { statusCode: 413, body: JSON.stringify({ error: '저장 데이터가 너무 큽니다 (5MB 제한).' }) };
  }

  const store = getStore({ name: 'eldria-saves', consistency: 'strong' });
  const key = `${user.sub}/${slotId}`;

  try {
    await store.set(key, data, {
      metadata: { updatedAt: new Date().toISOString(), userEmail: user.email || '' }
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true, updatedAt: new Date().toISOString() }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: '저장 중 오류가 발생했습니다.', detail: String(e) }) };
  }
};
