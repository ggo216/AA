// 불러오기: 로그인한 유저의 세이브 데이터를 Netlify Blobs에서 가져온다.
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: '로그인이 필요합니다.' }) };
  }

  const params = event.queryStringParameters || {};
  const slotId = params.slotId;

  const store = getStore({ name: 'eldria-saves', consistency: 'strong' });

  try {
    if (slotId) {
      const value = await store.get(`${user.sub}/${slotId}`);
      const metadata = await store.getMetadata(`${user.sub}/${slotId}`);
      if (value === null) {
        return { statusCode: 404, body: JSON.stringify({ error: '저장된 데이터가 없습니다.' }) };
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, data: value, meta: metadata ? metadata.metadata : null }) };
    } else {
      // 슬롯 목록 조회
      const { blobs } = await store.list({ prefix: `${user.sub}/` });
      const slots = blobs.map(b => ({ key: b.key.split('/').slice(1).join('/') }));
      return { statusCode: 200, body: JSON.stringify({ ok: true, slots }) };
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: '불러오기 중 오류가 발생했습니다.', detail: String(e) }) };
  }
};
