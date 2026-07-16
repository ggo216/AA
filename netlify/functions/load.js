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

  // save.js와 동일한 이유로, 자동 컨텍스트 주입이 안 되는 환경을 위해 환경변수가 있으면 수동 전달한다.
  const storeOpts = { name: 'eldria-saves', consistency: 'strong' };
  if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
    storeOpts.siteID = process.env.BLOBS_SITE_ID;
    storeOpts.token = process.env.BLOBS_TOKEN;
  }
  const store = getStore(storeOpts);

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
      const { blobs } = await store.list({ prefix: `${user